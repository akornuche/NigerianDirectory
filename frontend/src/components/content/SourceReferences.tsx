import { LinkIcon, BuildingLibraryIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface ContentSource {
    url: string;
    title?: string;
    type?: string;
    confidence?: number;
}

interface Props {
    sources?: ContentSource[];
    enrichedAt?: string;
    institutionName: string;
}

function hostOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

/**
 * Numbered reference list for the sources an institution's content was
 * compiled from.
 *
 * Content was previously published with no attribution, which gave readers no
 * way to verify a claim and gave the cited sites no credit. Outbound links
 * carry rel="nofollow noopener noreferrer": the citation is for the reader's
 * benefit and should not pass ranking signal automatically.
 */
export default function SourceReferences({ sources, enrichedAt, institutionName }: Props) {
    if (!sources || sources.length === 0) {
        return null;
    }

    // One entry per domain and path, preserving first-seen order so the
    // institution's own pages appear before third-party references.
    const seen = new Set<string>();
    const unique = sources.filter((source) => {
        if (!source.url) return false;
        const key = source.url.replace(/\/+$/, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    if (unique.length === 0) {
        return null;
    }

    const official = unique.filter((s) => s.type === 'official_website');
    const external = unique.filter((s) => s.type !== 'official_website');
    const ordered = [...official, ...external];

    const compiled = enrichedAt
        ? new Date(enrichedAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : null;

    return (
        <section id="sources" className="scroll-mt-24" aria-labelledby="sources-heading">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <LinkIcon className="h-6 w-6" />
                </div>
                <h2
                    id="sources-heading"
                    className="text-2xl lg:text-3xl font-display font-bold text-gray-900"
                >
                    Sources &amp; References
                </h2>
            </div>

            <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Information about {institutionName} on this page was compiled from the
                    following {ordered.length === 1 ? 'source' : `${ordered.length} sources`}
                    {compiled ? `, last reviewed ${compiled}` : ''}.
                </p>

                <ol className="space-y-4">
                    {ordered.map((source, index) => {
                        const isOfficial = source.type === 'official_website';
                        const Icon = isOfficial ? BuildingLibraryIcon : GlobeAltIcon;

                        return (
                            <li key={source.url} className="flex gap-4">
                                <span
                                    className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center"
                                    aria-hidden="true"
                                >
                                    {index + 1}
                                </span>

                                <div className="min-w-0">
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="nofollow noopener noreferrer"
                                        className="text-indigo-700 hover:text-indigo-900 font-medium underline decoration-indigo-200 hover:decoration-indigo-500 break-words"
                                    >
                                        {source.title?.trim() || hostOf(source.url)}
                                    </a>

                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                        <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                        <span className="truncate">{hostOf(source.url)}</span>
                                        {isOfficial && (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                                Official site
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <p className="text-xs text-gray-400 mt-8 leading-relaxed">
                    Details may change without notice. Confirm admission requirements, fees and
                    deadlines directly with the institution before acting on them.
                </p>
            </div>
        </section>
    );
}
