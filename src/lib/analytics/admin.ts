import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type EventCountRow = { event_name: string; events: bigint; sessions: bigint };
type LocaleRow = {
  locale: string;
  visitors: bigint;
  engaged: bigint;
  diagnosis_viewers: bigint;
  diagnosis_selectors: bigint;
  chatbot_openers: bigint;
  chatbot_questioners: bigint;
  handoff_users: bigint;
};
type DailyRow = { day: Date; locale: string; page_views: bigint; questions: bigint; successes: bigint; no_context: bigint };
type ScalarRow = { count: bigint };

function number(value: bigint | number | null | undefined) {
  return Number(value || 0);
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export async function getProductAnalytics(days: number) {
  const boundedDays = Math.min(90, Math.max(1, Math.trunc(days)));
  const since = new Date(Date.now() - boundedDays * 24 * 60 * 60 * 1000);

  const [eventRows, localeRows, dailyRows, answerSourceRows, completedHandoffRows] = await Promise.all([
    db.$queryRaw<EventCountRow[]>(Prisma.sql`
      SELECT event_name, count(*)::bigint AS events, count(DISTINCT anonymous_id)::bigint AS sessions
      FROM public.product_events
      WHERE occurred_at >= ${since}
      GROUP BY event_name
    `),
    db.$queryRaw<LocaleRow[]>(Prisma.sql`
      SELECT locale,
        count(DISTINCT anonymous_id) FILTER (WHERE event_name = 'page_view')::bigint AS visitors,
        count(DISTINCT anonymous_id) FILTER (WHERE event_name IN ('diagnosis_card_selected','chatbot_opened','chatbot_question_sent'))::bigint AS engaged,
        count(DISTINCT anonymous_id) FILTER (WHERE event_name = 'diagnosis_viewed')::bigint AS diagnosis_viewers,
        count(DISTINCT anonymous_id) FILTER (WHERE event_name = 'diagnosis_card_selected')::bigint AS diagnosis_selectors,
        count(DISTINCT anonymous_id) FILTER (WHERE event_name = 'chatbot_opened')::bigint AS chatbot_openers,
        count(DISTINCT anonymous_id) FILTER (WHERE event_name = 'chatbot_question_sent')::bigint AS chatbot_questioners,
        count(DISTINCT anonymous_id) FILTER (WHERE event_name = 'handoff_created')::bigint AS handoff_users
      FROM public.product_events
      WHERE occurred_at >= ${since}
      GROUP BY locale
      ORDER BY locale
    `),
    db.$queryRaw<DailyRow[]>(Prisma.sql`
      SELECT date_trunc('day', occurred_at) AS day, locale,
        count(*) FILTER (WHERE event_name = 'page_view')::bigint AS page_views,
        count(*) FILTER (WHERE event_name = 'chatbot_question_sent')::bigint AS questions,
        count(*) FILTER (WHERE event_name = 'chatbot_answer_succeeded')::bigint AS successes,
        count(*) FILTER (WHERE event_name = 'chatbot_no_context')::bigint AS no_context
      FROM public.product_events
      WHERE occurred_at >= ${since}
      GROUP BY 1, locale
      ORDER BY 1, locale
    `),
    db.$queryRaw<ScalarRow[]>(Prisma.sql`
      SELECT count(*)::bigint AS count
      FROM public.product_events
      WHERE occurred_at >= ${since}
        AND event_name = 'chatbot_answer_succeeded'
        AND coalesce(properties ->> 'sourceCount', '') ~ '^[0-9]+$'
        AND (properties ->> 'sourceCount')::integer > 0
    `),
    db.$queryRaw<ScalarRow[]>(Prisma.sql`
      SELECT count(DISTINCT properties ->> 'taskId')::bigint AS count
      FROM public.product_events
      WHERE occurred_at >= ${since}
        AND event_name = 'handoff_response_completed'
        AND properties ? 'taskId'
    `),
  ]);

  const counts = new Map(eventRows.map((row) => [row.event_name, { events: number(row.events), sessions: number(row.sessions) }]));
  const events = (name: string) => counts.get(name)?.events || 0;
  const sessions = (name: string) => counts.get(name)?.sessions || 0;
  const pageVisitors = sessions("page_view");
  const diagnosisViews = sessions("diagnosis_viewed");
  const diagnosisSelections = sessions("diagnosis_card_selected");
  const chatbotOpens = sessions("chatbot_opened");
  const firstQuestions = sessions("chatbot_question_sent");
  const questionAttempts = events("chatbot_question_sent");
  const answers = events("chatbot_answer_succeeded");
  const failures = events("chatbot_answer_failed");
  const noContext = events("chatbot_no_context");
  const answerWithSources = number(answerSourceRows[0]?.count);
  const citationSessions = sessions("citation_clicked");
  const handoffs = events("handoff_created");
  const completedHandoffs = number(completedHandoffRows[0]?.count);

  return {
    range: { days: boundedDays, since: since.toISOString(), until: new Date().toISOString() },
    funnel: {
      pageVisitors,
      diagnosisViews,
      diagnosisSelections,
      diagnosisSelectionRate: rate(diagnosisSelections, diagnosisViews),
      chatbotOpens,
      chatbotOpenRate: rate(chatbotOpens, pageVisitors),
      firstQuestions,
      firstQuestionRate: rate(firstQuestions, chatbotOpens),
      questionAttempts,
      answers,
      answerSuccessRate: rate(answers, questionAttempts),
      noContext,
      noContextRate: rate(noContext, answers),
      retries: events("chatbot_retry"),
      retryRate: rate(events("chatbot_retry"), failures || questionAttempts),
      citationSessions,
      answersWithSources: answerWithSources,
      citationClickRate: rate(citationSessions, answerWithSources),
      handoffs,
      handoffConversionRate: rate(handoffs, firstQuestions),
      completedHandoffs,
      handoffCompletionRate: rate(completedHandoffs, handoffs),
    },
    locales: localeRows.map((row) => {
      const visitors = number(row.visitors);
      const engaged = number(row.engaged);
      return {
        locale: row.locale,
        visitors,
        engaged,
        dropoffRate: rate(Math.max(0, visitors - engaged), visitors),
        diagnosisSelectionRate: rate(number(row.diagnosis_selectors), number(row.diagnosis_viewers)),
        firstQuestionRate: rate(number(row.chatbot_questioners), number(row.chatbot_openers)),
        handoffUsers: number(row.handoff_users),
      };
    }),
    daily: dailyRows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      locale: row.locale,
      pageViews: number(row.page_views),
      questions: number(row.questions),
      successes: number(row.successes),
      noContext: number(row.no_context),
    })),
  };
}
