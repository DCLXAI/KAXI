#!/usr/bin/env python3
"""PretendardVariable.woff2를 한글과 그 외로 쪼갠다.

왜 필요한가
-----------
원본은 2,057,688 바이트 한 덩어리이고 unicode-range 없이 걸려 있어서, 어느
로케일로 들어오든 모든 방문자가 2 MB를 전부 받았다. 본문 서체라 LCP가 여기
묶인다. 그런데 그 2 MB의 78%는 한글 음절 11,172자다 — 베트남어나 몽골어
방문자에게는 단 한 글자도 쓰이지 않는다.

쪼개는 지점
-----------
한글 음절(U+AC00-D7A3) 하나만 잘라낸다. 그 결과 unicode-range가 네 토큰으로
표현되고, next/font의 `declarations`에 리터럴로 넣을 수 있다. 이게 중요한
제약이다: next/font는 "Font loader values must be explicitly written literals"를
강제하므로, 흩어진 범위 수천 개가 필요한 더 잘게 쪼개는 방식은 fonts.ts에
수십 KB짜리 문자열 리터럴을 박아야 한다. 그건 별개 결정으로 남겨둔다.

실행 (fonttools 필요, 결과물은 커밋한다)
----------------------------------------
    python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli
    /tmp/fontenv/bin/python scripts/subset-pretendard.py
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "fonts" / "PretendardVariable.woff2"
OUT = ROOT / "src" / "fonts"

# 한글 음절 블록. 이 한 줄이 분할 전체를 결정한다.
HANGUL_SYLLABLES = (0xAC00, 0xD7A3)

PLANS = {
    # 한글 음절을 제외한 전부 — 라틴, 라틴 확장, 키릴, 베트남어, 구두점,
    # 호환 자모, 전각. 네 로케일 모두가 받는다.
    "Pretendard-latin": lambda cmap: sorted(cmap - hangul(cmap)),
    # 한글 음절만. 한국어 페이지에서만 받는다.
    "Pretendard-korean": lambda cmap: sorted(hangul(cmap)),
}


def hangul(cmap):
    lo, hi = HANGUL_SYLLABLES
    return cmap & set(range(lo, hi + 1))


# fonts.ts에 리터럴로 들어가는 값.
#
# 서체가 실제로 담은 코드포인트를 나열하지 않고 블록 경계로만 쓴다. 나열하면
# 라틴 쪽만 3천 개 구간이 되어 수십 KB짜리 문자열이 되는데, unicode-range는
# "이 파일을 받을지" 만 정하므로 그럴 필요가 없다. 범위 안에 서체가 갖지 않은
# 글자가 섞여 있어도 브라우저는 글리프를 못 찾고 다음 서체로 넘어갈 뿐이다.
CSS_UNICODE_RANGE = {
    "Pretendard-latin": "U+0-ABFF, U+D7A4-10FFFF",
    "Pretendard-korean": "U+AC00-D7A3",
}


def main():
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        sys.exit("fonttools가 없다. 파일 상단 주석의 설치 명령을 보라.")

    if not SRC.exists():
        sys.exit(f"원본을 찾을 수 없다: {SRC}")

    cmap = set(TTFont(SRC).getBestCmap().keys())
    pyftsubset = Path(sys.executable).parent / "pyftsubset"

    total = 0
    for name, select in PLANS.items():
        codepoints = select(cmap)
        target = OUT / f"{name}.woff2"
        subprocess.run(
            [
                str(pyftsubset),
                str(SRC),
                "--unicodes=" + ",".join(f"U+{c:04X}" for c in codepoints),
                "--flavor=woff2",
                "--layout-features=*",
                f"--output-file={target}",
            ],
            check=True,
        )
        size = os.path.getsize(target)
        total += size
        print(f"{name:20s} {len(codepoints):6d} codepoints  {size:>9,} bytes")
        print(f"  unicode-range: {CSS_UNICODE_RANGE[name]}")

    original = os.path.getsize(SRC)
    print(f"\n원본 {original:,} bytes → 분할 합계 {total:,} bytes")
    print("로케일별 실제 전송량은 페이지에 어떤 글자가 있는지가 정한다.")


if __name__ == "__main__":
    main()
