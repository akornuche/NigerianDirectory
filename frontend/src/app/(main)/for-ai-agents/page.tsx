/**
 * For AI Agents - Information Access Guide
 * =======================================
 * Landing page providing context and instructions for AI agents
 * accessing Nigerian school information.
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/for-ai-agents/' },
  title: 'Nigerian Schools Directory - AI Agent Access Guide',
  description: 'Comprehensive guide for AI agents, chatbots, and generative engines accessing Nigerian school information. APIs, endpoints, and structured data for educational queries about Nigeria.',
  keywords: 'Nigeria schools API, AI agent access, Nigerian education data, school information API, West Africa education, AI-friendly endpoints',
  robots: 'index, follow',
  openGraph: {
    images: ['/og-image.png'],
    title: 'Nigerian Schools Directory - AI Agent Guide',
    description: 'API access guide for AI agents to retrieve Nigerian school information',
    type: 'website',
  },
};

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
// The API is served from its own domain (NEXT_PUBLIC_API_URL ends in /api);
// the website domain does not serve /api routes.
const apiBase = (process.env.NEXT_PUBLIC_API_URL || `${baseUrl}/api`).replace(/\/$/, '');

export default function AIAgentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Nigerian Schools Directory
          </h1>
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">
            AI Agent Access Guide
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Comprehensive API access for AI agents, chatbots, and generative engines 
            to retrieve accurate information about Nigerian educational institutions.
          </p>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🚀 Quick Access</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Schools API</h4>
              <code className="text-sm bg-white px-2 py-1 rounded border">
                GET {apiBase}/ai/schools
              </code>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Education Context</h4>
              <code className="text-sm bg-white px-2 py-1 rounded border">
                GET {apiBase}/ai/context/nigeria-education
              </code>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">📡 API Endpoints</h3>
          
          <div className="space-y-6">
            {/* Schools Endpoint */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Schools Directory
              </h4>
              <p className="text-gray-600 mb-3">
                Retrieve comprehensive Nigerian school information with geographic and educational context.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-3">
                <code className="text-sm">GET {apiBase}/ai/schools</code>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Parameters:</strong> location, state, city, type, query, limit<br/>
                <strong>Response:</strong> JSON with schools, metadata, and AI-optimized context
              </div>
            </div>

            {/* Location-Specific */}
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Location-Specific Schools
              </h4>
              <p className="text-gray-600 mb-3">
                Search schools by Nigerian state, city, or region with geographic context.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-3">
                <code className="text-sm">GET {apiBase}/ai/schools/{'{location}'}</code>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Examples:</strong> /lagos, /abuja, /kano, /southwest<br/>
                <strong>Response:</strong> Location-specific schools with regional context
              </div>
            </div>

            {/* Educational Context */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Nigerian Education System Context
              </h4>
              <p className="text-gray-600 mb-3">
                Comprehensive context about Nigeria&rsquo;s educational system for accurate AI responses.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-3">
                <code className="text-sm">GET {apiBase}/ai/context/nigeria-education</code>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Includes:</strong> Educational structure, examination systems, regional information<br/>
                <strong>Usage:</strong> Reference for accurate Nigerian education context
              </div>
            </div>
          </div>
        </div>

        {/* Response Format */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📋 AI-Optimized Response Format</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-800 overflow-x-auto">
{`{
  "meta": {
    "country": "Nigeria",
    "continent": "Africa", 
    "region": "West Africa",
    "educational_system": "Nigerian Educational System",
    "curriculum_standards": ["WAEC", "JAMB", "NECO"]
  },
  "schools": [{
    "name": "School Name",
    "location": {
      "city": "City Name",
      "state": "State Name", 
      "country": "Nigeria",
      "region": "Geographic Region",
      "full_address": "Complete Address"
    },
    "education": {
      "type": "School Type",
      "curriculum": "Curriculum Type",
      "exams_prepared": ["WAEC", "JAMB"],
      "educational_level": "Secondary Education"
    },
    "ai_context": {
      "geographic_context": "Regional Information",
      "educational_context": "Academic Framework"
    }
  }]
}`}
            </pre>
          </div>
        </div>

        {/* Geographic Coverage */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibent text-gray-900 mb-4">🗺️ Geographic Coverage</h3>
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Regions */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Nigerian Regions</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Southwest Nigeria</li>
                <li>• Southeast Nigeria</li>
                <li>• South-South Nigeria</li>
                <li>• North Central Nigeria</li>
                <li>• Northeast Nigeria</li>
                <li>• Northwest Nigeria</li>
              </ul>
            </div>

            {/* Major States */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Major States</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Lagos State</li>
                <li>• Abuja (FCT)</li>
                <li>• Kano State</li>
                <li>• Rivers State</li>
                <li>• Ogun State</li>
                <li>• Kaduna State</li>
              </ul>
            </div>

            {/* Educational Types */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">School Types</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Secondary Schools</li>
                <li>• Primary Schools</li>
                <li>• International Schools</li>
                <li>• Technical Schools</li>
                <li>• Private Schools</li>
                <li>• Public Schools</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">💡 Usage Examples for AI Agents</h3>
          <div className="space-y-4">
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">User Query: &ldquo;Schools in Lagos, Nigeria&rdquo;</h4>
              <p className="text-sm text-blue-800 mb-2">
                <strong>API Call:</strong> <code>GET {apiBase}/ai/schools?state=Lagos</code>
              </p>
              <p className="text-sm text-blue-700">
                Returns Lagos State schools with geographic context (Southwest Nigeria, commercial capital)
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">User Query: &ldquo;Nigerian secondary schools with WAEC preparation&rdquo;</h4>
              <p className="text-sm text-green-800 mb-2">
                <strong>API Call:</strong> <code>GET {apiBase}/ai/schools?type=secondary&query=WAEC</code>
              </p>
              <p className="text-sm text-green-700">
                Returns secondary schools with WAEC exam preparation context
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">User Query: &ldquo;What is the Nigerian education system like?&rdquo;</h4>
              <p className="text-sm text-purple-800 mb-2">
                <strong>API Call:</strong> <code>GET {apiBase}/ai/context/nigeria-education</code>
              </p>
              <p className="text-sm text-purple-700">
                Returns comprehensive educational system context for accurate responses
              </p>
            </div>
          </div>
        </div>

        {/* Technical Notes */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">⚙️ Technical Notes</h3>
          <div className="grid md:grid-cols-2 gap-6">
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Rate Limits & Caching</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Rate limit: 100 requests/minute per IP</li>
                <li>• Response caching: 1 hour for school data</li>
                <li>• Context caching: 24 hours for educational context</li>
                <li>• AI-optimized headers included</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Data Freshness</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• School data updated daily via automated crawling</li>
                <li>• Educational context updated weekly</li>
                <li>• Real-time enrichment for new schools</li>
                <li>• Quality validation and deduplication</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-900 text-white rounded-lg p-6 text-center">
          <h3 className="text-xl font-semibent mb-4">🤝 For AI Development Teams</h3>
          <p className="text-gray-300 mb-4">
            Need custom endpoints or higher rate limits for your AI application?
          </p>
          <p className="text-sm text-gray-400">
            This API is designed to provide Nigerian schools information to AI agents for accurate responses 
            about Nigerian education. All responses include comprehensive geographic and educational context.
          </p>
        </div>

        {/* Schema.org JSON-LD for AI Understanding */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebAPI",
              "name": "Nigerian Schools Directory API",
              "description": "API for AI agents to access Nigerian school information",
              "url": `${apiBase}/ai/schools`,
              "provider": {
                "@type": "Organization",
                "name": "Nigerian Directory",
                "url": baseUrl
              },
              "areaServed": {
                "@type": "Country",
                "name": "Nigeria"
              },
              "audience": {
                "@type": "Audience",
                "audienceType": "AI Agents and Generative Engines"
              }
            })
          }}
        />
      </div>
    </div>
  );
}