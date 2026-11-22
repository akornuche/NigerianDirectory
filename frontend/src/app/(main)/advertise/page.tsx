import { Metadata } from 'next';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  GlobeAltIcon,
  EnvelopeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  alternates: { canonical: '/advertise/' },
  title: 'Advertise With Us - Reach Nigerian Parents & Schools',
  description: 'Advertise on NigerianDirectory.com and reach thousands of parents searching for schools in Nigeria. Banner ads, sponsored listings, and featured placements available.',
};

const stats = [
  { label: 'Monthly Visitors', value: '50K+', icon: UserGroupIcon },
  { label: 'Schools Listed', value: '200+', icon: GlobeAltIcon },
  { label: 'Engagement Rate', value: '4.5%', icon: ChartBarIcon },
];

const adOptions = [
  {
    name: 'Banner Advertising',
    description: 'Display ads across our high-traffic pages',
    features: [
      'Leaderboard (728x90) - Header/Footer',
      'Rectangle (300x250) - Sidebar',
      'Mobile Banner (320x50) - Mobile devices',
      'Skyscraper (300x600) - Premium sidebar',
    ],
    price: 'From ₦50,000/month',
    popular: false,
  },
  {
    name: 'Featured School Listing',
    description: 'Boost your school&apos;s visibility with premium placement',
    features: [
      'Top position in search results',
      'Featured badge on school profile',
      'Homepage showcase placement',
      'Priority in state/area listings',
    ],
    price: 'From ₦100,000/month',
    popular: true,
  },
  {
    name: 'Sponsored Content',
    description: 'Native advertising that engages parents',
    features: [
      'Custom blog posts about your school',
      'School spotlight articles',
      'Video content promotion',
      'Social media amplification',
    ],
    price: 'From ₦150,000/campaign',
    popular: false,
  },
];

const targetAudience = [
  'Parents searching for schools',
  'School administrators',
  'Education consultants',
  'Educational service providers',
  'School supply vendors',
  'Tutoring services',
];

export default function AdvertisePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-display font-bold">
              Advertise on NigerianDirectory
            </h1>
            <p className="mt-6 text-xl text-primary-100">
              Reach thousands of Nigerian parents actively searching for schools.
              Connect with your target audience when they&apos;re making important education decisions.
            </p>
            <div className="mt-8">
              <a 
                href="#contact" 
                className="inline-flex items-center px-6 py-3 bg-secondary-400 hover:bg-secondary-500 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
                  <stat.icon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad Options */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-gray-900">
              Advertising Options
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Choose the advertising format that best fits your goals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {adOptions.map((option) => (
              <div 
                key={option.name}
                className={`bg-white rounded-xl p-6 shadow-sm border-2 ${
                  option.popular ? 'border-primary-500 relative' : 'border-transparent'
                }`}
              >
                {option.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-semibold text-gray-900">{option.name}</h3>
                <p className="mt-2 text-gray-600 text-sm">{option.description}</p>
                <ul className="mt-6 space-y-3">
                  {option.features.map((feature) => (
                    <li key={feature} className="flex items-start text-sm">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-6 border-t">
                  <span className="text-lg font-bold text-gray-900">{option.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-display font-bold text-gray-900">
                Reach Your Target Audience
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Our visitors are actively searching for educational solutions.
                Your ads reach people at the perfect moment in their decision-making process.
              </p>
              <ul className="mt-8 grid grid-cols-2 gap-4">
                {targetAudience.map((audience) => (
                  <li key={audience} className="flex items-center text-gray-700">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500 mr-2" />
                    {audience}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-100 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Why Advertise With Us?</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="bg-primary-100 text-primary-600 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">1</span>
                  <div>
                    <strong className="text-gray-900">High-Intent Audience</strong>
                    <p className="text-sm text-gray-600">Parents actively searching for schools</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary-100 text-primary-600 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">2</span>
                  <div>
                    <strong className="text-gray-900">Targeted Reach</strong>
                    <p className="text-sm text-gray-600">Geographic and demographic targeting available</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary-100 text-primary-600 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">3</span>
                  <div>
                    <strong className="text-gray-900">Measurable Results</strong>
                    <p className="text-sm text-gray-600">Detailed analytics and reporting</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary-100 text-primary-600 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">4</span>
                  <div>
                    <strong className="text-gray-900">Flexible Budgets</strong>
                    <p className="text-sm text-gray-600">Options for businesses of all sizes</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-16 lg:py-24 bg-gray-50">
        <div className="mx-auto max-w-3xl container-padding">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-gray-900">
              Get In Touch
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Ready to advertise? Contact us and we&apos;ll create a custom advertising package for you.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8">
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company / Organization
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label htmlFor="interest" className="block text-sm font-medium text-gray-700 mb-2">
                  Interested In
                </label>
                <select
                  id="interest"
                  name="interest"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select an option</option>
                  <option value="banner">Banner Advertising</option>
                  <option value="featured">Featured School Listing</option>
                  <option value="sponsored">Sponsored Content</option>
                  <option value="other">Other / Custom Package</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Tell us about your advertising goals..."
                />
              </div>
              <button
                type="submit"
                className="w-full btn-primary py-3"
              >
                <EnvelopeIcon className="h-5 w-5 mr-2 inline" />
                Send Inquiry
              </button>
            </form>
          </div>

          <div className="mt-8 text-center text-gray-600">
            <p>
              Or email us directly at{' '}
              <a href="mailto:advertise@nigeriandirectory.com" className="text-primary-600 hover:underline">
                advertise@nigeriandirectory.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
