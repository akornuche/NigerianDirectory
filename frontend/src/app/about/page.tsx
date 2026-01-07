import { Metadata } from 'next';
import Link from 'next/link';
import { AcademicCapIcon, GlobeAltIcon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'About Us - NigerianDirectory | Nigeria\'s School Directory',
  description: 'Learn about NigerianDirectory.com - Nigeria\'s most comprehensive school directory. Our mission is to help parents find the perfect school for their children.',
};

const features = [
  {
    icon: AcademicCapIcon,
    title: 'Comprehensive Listings',
    description: 'Access detailed information on primary, secondary, and international schools across all 36 states and FCT.',
  },
  {
    icon: GlobeAltIcon,
    title: 'Nationwide Coverage',
    description: 'From Lagos to Kano, Abuja to Port Harcourt - we cover schools in every corner of Nigeria.',
  },
  {
    icon: UserGroupIcon,
    title: 'Community Driven',
    description: 'Real reviews and ratings from parents, students, and educators help you make informed decisions.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Verified Information',
    description: 'School profiles are verified and regularly updated to ensure accuracy and reliability.',
  },
];

const stats = [
  { value: '192+', label: 'Schools Listed' },
  { value: '36+', label: 'States Covered' },
  { value: '1000+', label: 'Monthly Visitors' },
  { value: '100%', label: 'Free to Use' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              About NigerianDirectory
            </h1>
            <p className="text-xl text-primary-100">
              Nigeria&apos;s most comprehensive school directory, helping parents and students 
              find the perfect educational institution since 2024.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Mission</h2>
            <p className="text-lg text-gray-600 mb-6">
              At NigerianDirectory, we believe every child deserves access to quality education. 
              Our mission is to bridge the information gap between schools and families by providing 
              a comprehensive, easy-to-use platform for discovering and comparing educational institutions 
              across Nigeria.
            </p>
            <p className="text-lg text-gray-600">
              Whether you&apos;re looking for a private school in Lagos, an international school in Abuja, 
              or a boarding school in the Northern region, we&apos;re here to help you make an informed decision 
              about your child&apos;s education.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Why Choose Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find the Perfect School?</h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Start exploring our comprehensive database of Nigerian schools today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/schools/lagos/" className="btn-white">
              Browse Schools
            </Link>
            <Link href="/contact/" className="btn-outline-white">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
