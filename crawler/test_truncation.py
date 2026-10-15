"""
Checks that section text is never stored mid-sentence.

Covers the two fragment shapes that reached the published page:
  "...have these facilities: Ayodele Fa"
  "...report to Council an"

Usage: python test_truncation.py
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from university_crawler import UniversityCrawler as U

CASES = [
    # (label, text, limit, must_end_with, must_not_contain)
    (
        'cuts at sentence boundary',
        'The university was founded in 1948. It became independent in 1962. '
        'A third sentence that will not fit inside the budget at all.',
        70,
        '.',
        'A third',
    ),

    (
        'drops dangling clause',
        'The University of Ibadan is a complex organization. Its governance is '
        'based on the Committee System; all the Boards report to Council an',
        110,
        '.',
        'Council an',
    ),
    (
        'short text passes through unchanged',
        'A complete sentence.',
        500,
        '.',
        None,
    ),
    (
        'respects abbreviation as non-terminal',
        'The vice-chancellor is Prof. Kayode Adebowale and he leads the senate '
        'through a long sentence that exceeds the limit here.',
        45,
        None,
        'Kayode Adebowale and he leads',
    ),
    (
        'marks a boundary-less cut as continuing',
        'one continuous clause with no terminator anywhere in sight at all',
        30,
        '…',
        None,
    ),
    # Regression: requiring a trailing period here discarded most harvested
    # prose, because web copy often omits one, and website yield fell to zero.
    (
        'keeps unterminated text that already fits',
        'Faculty of Science offers degrees in physics and chemistry',
        500,
        None,
        None,
    ),
]


JOIN_CASES = [
    # The exact fragment shapes reported on the published page. Both arrive
    # inside the length budget, so they are cleaned when the section is
    # assembled rather than when a block is truncated.
    (
        'drops dangling fragment after colon list',
        [
            'The hall offers a Two-man room and a One-man room.',
            'Both have these facilities: Ayodele Fa',
        ],
        4000,
        'Ayodele Fa',
    ),
    (
        'assembled section closes on a sentence',
        [
            'The University of Ibadan is a complex organization.',
            'Its governance is based on the Committee System; all the Boards report to Council an',
        ],
        4000,
        'Council an',
    ),
    (
        'skips a block that will not fit rather than slicing it',
        [
            'First complete sentence here.',
            'A second block that is far too long to fit inside the remaining budget at all.',
        ],
        40,
        'A second block',
    ),
]


def main():
    failures = 0

    for label, text, limit, must_end, must_not in CASES:
        result = U._truncate_at_sentence(text, limit)

        problems = []

        if len(result) > limit:
            problems.append(f'exceeded limit: {len(result)} > {limit}')

        if must_end and result and not result.endswith(must_end):
            problems.append(f'does not end with {must_end!r}: {result[-25:]!r}')

        if must_not and must_not in result:
            problems.append(f'contains fragment {must_not!r}')

        # Truncated output must not end mid-word. Text that already fitted is
        # returned verbatim and is allowed to lack a terminator.
        was_truncated = len(text) > limit
        if was_truncated and result and not result.endswith(('.', '!', '?', '"', ')', '…')):
            problems.append(f'ends mid-sentence: {result[-25:]!r}')

        if result and not was_truncated and result != text.strip():
            problems.append('text within budget was altered')

        status = 'ok  ' if not problems else 'FAIL'
        if problems:
            failures += 1

        print(f'{status} {label}')
        print(f'       -> {result!r}')
        for problem in problems:
            print(f'       !! {problem}')

    for label, blocks, limit, must_not in JOIN_CASES:
        result = U._join_blocks(blocks, limit)

        problems = []
        if len(result) > limit:
            problems.append(f'exceeded limit: {len(result)} > {limit}')
        if must_not and must_not in result:
            problems.append(f'contains fragment {must_not!r}')
        if result and not result.endswith(('.', '!', '?', '"', ')', '…')):
            problems.append(f'unterminated: {result[-25:]!r}')

        status = 'ok  ' if not problems else 'FAIL'
        if problems:
            failures += 1

        print(f'{status} {label}')
        print(f'       -> {result!r}')
        for problem in problems:
            print(f'       !! {problem}')

    total = len(CASES) + len(JOIN_CASES)
    print()
    print(f'{total - failures}/{total} passed')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
