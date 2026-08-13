import { cache } from "react";
import { getCurrentKaxiSession } from "@/lib/supabase/auth";

export const getCachedCurrentKaxiSession = cache(getCurrentKaxiSession);
