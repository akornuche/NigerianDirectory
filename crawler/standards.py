"""
Data standard for every crawler (documents/REMEDIATION_PLAN.md, section 4).

The 2026-11-21 audit found that the pipeline published text about other
institutions, scraped page furniture and adverts, cited this site as its own
source, and attached universities' websites to secondary schools. Each rule
below exists to stop one of those failures, and every crawler must use these
functions rather than re-implementing its own checks.
"""
import re
from typing import Iterable, Optional
from urllib.parse import urlparse

# ── Sources ──────────────────────────────────────────────────────────────────
# Never cite or harvest: this site itself (circular), and AI-generated
# encyclopaedias (not an independent source).
BLOCKED_SOURCE_DOMAINS = (
    'nigeriandirectory.com.ng',
    'nigeriandirectory.com',
    'grokipedia.com',
)
# Job boards, aggregators and listicle sites. They may corroborate a fact but
# are never the only source of one, and their text is never published.
LOW_TRUST_DOMAINS = (
    'joberplanet.com', 'recruitmentmat.com', 'recruitmentz.com.ng', 'currentaffairs.com.ng',
    'myspotfinder.com', 'ng.africabz.com', 'soluap.com', 'nigerianinformer.com',
    'schoolmata.com', 'academics.ng', 'varsity.ng', 'educationngr.com.ng', 'studyplace.ng',
    'kingbeng.com', 'smartjamb.com', 'manpower.com.ng', 'finelib.com', 'edusko.com',
    'schoolregistry.ng', 'nigerianqueries.com', 'researchaffairs.com.ng',
)

# ── Junk text ────────────────────────────────────────────────────────────────
# Page furniture, bylines, adverts, listicles and mis-decoded characters seen
# in the audit. Kept narrow on purpose: phrases such as "teacher recruitment"
# or "top 3 best performers" can appear in legitimate text.
JUNK_PATTERN = re.compile(
    r"click here|subscribe|cookie|sign up|login credentials|\blog ?in to\b|whatsapp|telegram|\bsponsored (?:post|content|link|ad)s?\b|"
    r"jamb subject combination|\bby [a-z]+ team\b|amazon sinks|bitcoin|crypto|free training|"
    r"read more|join our|apply now|job vacanc|all rights reserved|privacy policy|terms of (?:use|service)|"
    r"this is not another list|compiled list|list of (?:historic|best|top)|"
    r"\btop \d+ (?:best )?[a-z& ]{0,30}?(?:universities|schools|courses|colleges)\b|lorem ipsum|â€",
    re.IGNORECASE,
)

GENERIC_WORDS = frozenset(
    'the of and a an in at for school schools college secondary high grammar girls boys government '
    'federal state comprehensive community model day memorial academy international technical science '
    'sciences staff nigeria nigerian unity girl boy senior junior university polytechnic institute'.split()
)

MIN_SECTION_CHARS = 300
LEAD_CHARS = 350


def domain_of(url: str) -> str:
    host = (urlparse(url if '://' in url else 'http://' + url).hostname or '').lower()
    return host[4:] if host.startswith('www.') else host


def _matches(domain: str, listed: Iterable[str]) -> bool:
    return any(domain == d or domain.endswith('.' + d) for d in listed)


def is_blocked_source(url: str) -> bool:
    return _matches(domain_of(url), BLOCKED_SOURCE_DOMAINS)


def is_low_trust_source(url: str) -> bool:
    return _matches(domain_of(url), LOW_TRUST_DOMAINS)


def _words(text: str) -> list:
    text = text.lower().replace('&', 'and').replace("'", '').replace('-', ' ')
    return re.sub(r'[^a-z0-9 ]', ' ', text).split()


def distinctive_tokens(name: str, location_words: Iterable[Optional[str]] = ()) -> set:
    """Words that identify this institution: not generic, and not merely its
    location. "Federal Government College Osun" has none, because "osun" is
    its state; a crawler must not match it to anything on that word alone."""
    loc = {w for part in location_words if part for w in _words(part)}
    return {w for w in _words(name) if w not in GENERIC_WORDS and w not in loc and len(w) > 2}


def mentions_institution(text: str, name: str, location_words: Iterable[Optional[str]] = ()) -> bool:
    lowered = ' ' + ' '.join(_words(text)) + ' '
    tokens = distinctive_tokens(name, location_words)
    if tokens:
        return any(f' {t} ' in lowered for t in tokens)
    # Nothing distinctive: require the full name.
    return ' ' + ' '.join(_words(name)) + ' ' in lowered


def is_junk(text: str) -> bool:
    return bool(JUNK_PATTERN.search(text))


def block_is_relevant(block: str, name: str, location_words: Iterable[Optional[str]] = ()) -> bool:
    """A third-party text block may be used only if it names the institution
    and is not page furniture or an advert."""
    return not is_junk(block) and mentions_institution(block, name, location_words)


def section_passes(text: Optional[str], name: str, location_words: Iterable[Optional[str]] = ()) -> bool:
    """Content gate (standard 4.3): long enough, opens with this institution,
    and contains no junk."""
    text = (text or '').strip()
    return (len(text) >= MIN_SECTION_CHARS
            and mentions_institution(text[:LEAD_CHARS], name, location_words)
            and not is_junk(text))


# ── Websites ─────────────────────────────────────────────────────────────────
TERTIARY_DOMAIN = re.compile(r'^(uni|univ|poly|fedpo|fed[a-z]*poly)|university|polytechnic|college ?of ?education', re.I)


def website_plausibly_owned(url: str, name: str, category: str,
                            location_words: Iterable[Optional[str]] = (),
                            page_title: Optional[str] = None,
                            used_by_other_record: bool = False) -> bool:
    """Ownership check (standard 4.2). A website is stored only if:
      - no other record already uses the domain;
      - for a school, the domain is not a university's or polytechnic's;
      - the domain contains one of the name's distinctive words (or their
        initials), and, when the page title is known, the title names the
        institution too.
    Names with no distinctive word (only generic words and a location) are
    never matched: "Federal Government College Osun" must not get
    uniosun.edu.ng.
    """
    if used_by_other_record:
        return False
    domain = domain_of(url)
    core = domain.split('.')[0]
    if category == 'school' and TERTIARY_DOMAIN.search(core):
        return False
    # For a school, a location is never distinctive ("FGC Osun"). For a
    # university the state can be the name itself ("Kaduna State University").
    tokens = distinctive_tokens(name, location_words if category == 'school' else ())
    if not tokens:
        return False
    words = [w for w in _words(name) if w not in ('of', 'and', 'the')]
    initials = ''.join(w[0] for w in words)
    # Common Nigerian contraction: first two letters of the first
    # distinctive word plus the initials of the words after it
    # (Kaduna State University -> kasu).
    contractions = set()
    for i, w in enumerate(words):
        if w in tokens:
            contractions.add(w[:2] + ''.join(x[0] for x in words[i + 1:]))
            break
    in_domain = (any(t in core for t in tokens)
                 or (len(initials) >= 3 and initials in core)
                 or any(len(c) >= 4 and c in core for c in contractions))
    if not in_domain:
        return False
    if page_title is not None and not mentions_institution(page_title, name, location_words):
        return False
    return True
