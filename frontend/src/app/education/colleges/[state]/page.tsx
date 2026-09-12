import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';

async function getCollegesByState(state: string): Promise<{ name: string; schools: School[] } | null> {
    try {
        const response = await api.getSchools(1, 100, { state, category: 'polytechnic' });
        if (!response.schools || response.schools.length === 0) return null;
        const stateName = response.schools[0]?.state || state.replace(/-/g, ' ');
        return { name: stateName, schools: response.schools };
    } catch (error) {
        console.error('Error fetching colleges by state:', error);
        return null;
    }
}

interface Props {
    params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const stateName = resolvedParams.state.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return {
        title: `Polytechnics & Colleges in ${stateName} | NigerianDirectory`,
        description: `Browse list of polytechnics and colleges in ${stateName}, Nigeria.`,
    };
}

export default async function CollegeStatePage({ params }: Props) {
    const resolvedParams = await params;
    const stateData = await getCollegesByState(resolvedParams.state);

    if (!stateData) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Colleges in {resolvedParams.state.replace(/-/g, ' ')}</h1>
                    <p className="mt-2 text-gray-500">No institutions found for this location yet.</p>
                    <Link href="/education/colleges" className="mt-4 inline-block text-emerald-600 font-bold">← Back to Directory</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <header className="bg-emerald-600 text-white py-12">
                <div className="mx-auto max-w-7xl container-padding">
                    <h1 className="text-3xl font-display font-black">Polytechnics in {stateData.name} State</h1>
                    <p className="mt-4 opacity-80">Discover {stateData.schools.length} technical institutions.</p>
                </div>
            </header>

            <main className="mx-auto max-w-7xl container-padding py-12">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {stateData.schools.map((school) => (
                        <Link
                            key={school.slug}
                            href={`/education/colleges/${resolvedParams.state}/${school.city.toLowerCase().replace(/ /g, '-')}/${school.slug}/`}
                            className="bg-white rounded-2xl overflow-hidden border border-gray-100 p-6 hover:shadow-lg transition-shadow"
                        >
                            <h2 className="text-lg font-bold group-hover:text-emerald-600">{school.name}</h2>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                <MapPinIcon className="h-4 w-4 mr-1" /> {school.city}
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
