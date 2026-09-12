import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon, AcademicCapIcon, BuildingLibraryIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';

export const metadata: Metadata = {
    title: 'Polytechnics & Colleges in Nigeria - Technical & Vocational Education',
    description: 'Find top polytechnics, colleges of education, and monotechnics across Nigeria. Explore technical programs, admission requirements, and specialized training institutions.',
};

const nigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
    'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

async function getFeaturedInstitutions(): Promise<School[]> {
    try {
        const response = await api.getSchools(1, 12, { category: 'polytechnic' });
        return response.schools || [];
    } catch (error) {
        console.error('Error fetching featured colleges:', error);
        return [];
    }
}

export default async function CollegesPage() {
    const featuredSchools = await getFeaturedInstitutions();

    return (
        <>
            <div className="bg-gray-100 py-2">
                <div className="mx-auto max-w-7xl flex justify-center">
                    <AdBanner slot="colleges-top-leaderboard" size="leaderboard" />
                </div>
            </div>

            <nav className="bg-white border-b">
                <div className="mx-auto max-w-7xl container-padding py-3">
                    <ol className="flex items-center space-x-2 text-sm text-gray-500">
                        <li><Link href="/">Home</Link></li>
                        <li>/</li>
                        <li><Link href="/education/schools">Education</Link></li>
                        <li>/</li>
                        <li className="text-indigo-600 font-bold">Colleges & Polytechnics</li>
                    </ol>
                </div>
            </nav>

            <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white py-16 lg:py-24">
                <div className="mx-auto max-w-7xl container-padding">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpenIcon className="h-8 w-8" />
                            <span className="badge bg-emerald-400 text-gray-900 font-bold uppercase tracking-wider">Vocational Excellence</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-display font-bold leading-tight">
                            Polytechnics & Colleges in Nigeria
                        </h1>
                        <p className="mt-6 text-xl text-emerald-100 opacity-90 leading-relaxed">
                            Find technical and vocational excellence. Discover the best polytechnics,
                            colleges of education, and specialized monotechnics for practical skills
                            and professional certification.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-12 lg:py-16">
                <div className="mx-auto max-w-7xl container-padding">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                        <div className="w-1 h-8 bg-emerald-600 rounded-full"></div>
                        Browse by State
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {nigerianStates.map((state) => (
                            <Link
                                key={state}
                                href={`/education/colleges/${state.toLowerCase().replace(/ /g, '-')}/`}
                                className="group p-4 bg-white border border-gray-100 rounded-xl text-center hover:border-emerald-200 transition-all"
                            >
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-emerald-600">{state}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {featuredSchools.length > 0 && (
                <section className="py-12 lg:py-16 bg-gray-50">
                    <div className="mx-auto max-w-7xl container-padding">
                        <h2 className="text-2xl font-bold text-gray-900 mb-12">Top Rated Polytechnics</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {featuredSchools.map((school) => (
                                <Link
                                    key={school.slug}
                                    href={`/education/colleges/${school.state.toLowerCase().replace(/ /g, '-')}/${school.city.toLowerCase().replace(/ /g, '-')}/${school.slug}/`}
                                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all"
                                >
                                    <div className="aspect-[4/3] relative bg-emerald-50">
                                        <Image
                                            src={school.hero_image_url || school.logo_url || '/placeholder-college.svg'}
                                            alt={school.name}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 bg-white/90 text-emerald-700 text-[10px] font-black rounded-full uppercase">
                                                {school.type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 min-h-[3.5rem] group-hover:text-emerald-600">
                                            {school.name}
                                        </h3>
                                        <div className="mt-4 flex items-center text-sm text-gray-500">
                                            <MapPinIcon className="h-4 w-4 mr-2" />
                                            {school.city}, {school.state}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section className="py-16 bg-white">
                <div className="mx-auto max-w-4xl container-padding text-center">
                    <h2 className="text-3xl font-bold mb-6">Empowering the Technical Workforce</h2>
                    <p className="text-lg text-gray-600 leading-relaxed mb-8">
                        Polytechnics and Colleges of Education play a critical role in Nigeria&apos;s
                        development by providing specialized technical, vocational, and teacher training.
                        Our database helps you find institutions providing ND, HND, and NCE programs
                        with modern facilities and industry-aligned curricula.
                    </p>
                    <div className="flex justify-center gap-4">
                        <div className="px-8 py-4 bg-emerald-50 text-emerald-800 rounded-2xl font-bold">100+ Polytechnics</div>
                        <div className="px-8 py-4 bg-emerald-50 text-emerald-800 rounded-2xl font-bold">80+ Colleges of Ed</div>
                    </div>
                </div>
            </section>
        </>
    );
}
