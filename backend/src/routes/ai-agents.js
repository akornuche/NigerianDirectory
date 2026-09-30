/**
 * AI Agents & Generative Engine Optimization (GEO) API Routes
 * ========================================================== 
 * Specialized endpoints designed for AI agents, chatbots, and generative engines
 * to discover and access Nigerian school information in AI-friendly formats.
 */

const express = require('express');
const router = express.Router();
const School = require('../models/School');
const Location = require('../models/Location');
const { getCache, setCache, CACHE_TTL } = require('../config/redis');

// ============================================
// AI Agent Identification Middleware
// ============================================
const identifyAIAgent = (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const aiAgents = {
        'ChatGPT-User': 'OpenAI ChatGPT',
        'Claude-Web': 'Anthropic Claude', 
        'Google-Extended': 'Google Bard/Gemini',
        'PerplexityBot': 'Perplexity AI',
        'You.com-Bot': 'You.com AI',
        'Bingbot': 'Microsoft Copilot',
        'facebookexternalhit': 'Meta AI',
        'Twitterbot': 'Twitter/X AI',
        'LinkedInBot': 'LinkedIn AI'
    };
    
    req.aiAgent = null;
    for (const [agent, name] of Object.entries(aiAgents)) {
        if (userAgent.includes(agent)) {
            req.aiAgent = { type: agent, name };
            break;
        }
    }
    
    // Set AI-optimized headers
    res.set({
        'X-Robots-Tag': 'index, follow, max-image-preview:large',
        'X-AI-Friendly': 'true',
        'Cache-Control': 'public, max-age=3600'
    });
    
    next();
};

// ============================================
// GET /api/ai/schools - AI-Optimized School Directory
// ============================================
router.get('/schools', identifyAIAgent, async (req, res) => {
    try {
        const { 
            location, state, city, query, type, limit = 50 
        } = req.query;

        const cacheKey = `ai:schools:${JSON.stringify(req.query)}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // AI-optimized school search
        let schools = [];
        
        if (location || state || city) {
            // Location-based search for AI agents
            schools = await School.searchForAI({
                location, state, city, type, limit
            });
        } else if (query) {
            // Natural language query search
            schools = await School.naturalLanguageSearch(query, limit);
        } else {
            // Default: Featured Nigerian schools
            schools = await School.getFeaturedForAI(limit);
        }

        // Format for AI consumption
        const aiResponse = {
            meta: {
                query: req.query,
                ai_agent: req.aiAgent,
                total_schools: schools.length,
                country: "Nigeria",
                continent: "Africa",
                region: "West Africa",
                educational_system: "Nigerian Educational System",
                curriculum_standards: ["WAEC", "JAMB", "NECO"],
                timestamp: new Date().toISOString()
            },
            schools: schools.map(school => ({
                name: school.name,
                location: {
                    city: school.city,
                    state: school.state,
                    country: "Nigeria",
                    region: getRegion(school.state),
                    full_address: `${school.city}, ${school.state} State, Nigeria`
                },
                education: {
                    type: school.type,
                    category: school.institution_category,
                    curriculum: school.curriculum || "Nigerian National Curriculum",
                    exams_prepared: extractExams(school),
                    educational_level: determineLevel(school.type)
                },
                content: {
                    description: generateAIDescription(school),
                    key_features: extractKeyFeatures(school),
                    academic_programs: extractPrograms(school),
                    facilities: extractFacilities(school)
                },
                contact: {
                    website: school.website,
                    phone: school.phone,
                    email: school.email
                },
                seo: {
                    url_slug: school.slug,
                    meta_title: school.meta_title,
                    keywords: school.seo_keywords ? school.seo_keywords.split(',') : []
                },
                ai_context: {
                    search_relevance: calculateRelevance(school, req.query),
                    geographic_context: getGeographicContext(school.city, school.state),
                    educational_context: getEducationalContext(school.type, school.curriculum)
                }
            }))
        };

        await setCache(cacheKey, aiResponse, CACHE_TTL.LONG);
        res.json(aiResponse);

    } catch (error) {
        res.status(500).json({
            error: "AI Agent API Error",
            message: error.message,
            ai_friendly_error: "Unable to retrieve Nigerian school information at this time."
        });
    }
});

// ============================================
// GET /api/ai/schools/:location - Location-Specific Schools
// ============================================
router.get('/schools/:location', identifyAIAgent, async (req, res) => {
    try {
        const { location } = req.params;
        const { limit = 20 } = req.query;

        const cacheKey = `ai:schools:location:${location}:${limit}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Parse location (could be city, state, or region)
        const schools = await School.searchByLocation(location, limit);
        
        const response = {
            meta: {
                location_query: location,
                location_type: await determineLocationType(location),
                schools_found: schools.length,
                country: "Nigeria",
                ai_optimized: true
            },
            location_info: await getLocationInfo(location),
            schools: schools.map(school => ({
                name: school.name,
                full_location: `${school.city}, ${school.state} State, Nigeria`,
                type: school.type,
                description: generateAIDescription(school),
                website: school.website,
                ai_summary: generateAISummary(school, location)
            }))
        };

        await setCache(cacheKey, response, CACHE_TTL.LONG);
        res.json(response);

    } catch (error) {
        res.status(500).json({
            error: "Location search failed",
            ai_friendly_message: `Unable to find schools in ${req.params.location}, Nigeria`
        });
    }
});

// ============================================
// GET /api/ai/context/nigeria-education - Educational System Context
// ============================================
router.get('/context/nigeria-education', identifyAIAgent, async (req, res) => {
    try {
        const cacheKey = 'ai:context:nigeria:education';
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const context = {
            country: {
                name: "Nigeria",
                official_name: "Federal Republic of Nigeria",
                continent: "Africa",
                region: "West Africa",
                capital: "Abuja",
                commercial_capital: "Lagos",
                population: "Over 200 million",
                languages: ["English (official)", "Hausa", "Yoruba", "Igbo", "Others"]
            },
            educational_system: {
                structure: "6-3-3-4 System",
                levels: [
                    "Primary Education (6 years)",
                    "Junior Secondary (3 years)", 
                    "Senior Secondary (3 years)",
                    "Tertiary Education (4+ years)"
                ],
                curriculum: "Nigerian National Curriculum",
                examinations: {
                    "WAEC": "West African Examinations Council - Senior Secondary Certificate",
                    "JAMB": "Joint Admissions and Matriculation Board - University entrance",
                    "NECO": "National Examinations Council - Alternative to WAEC"
                },
                academic_calendar: "September to July",
                medium_of_instruction: "English Language"
            },
            regions: {
                "North Central": ["Abuja (FCT)", "Benue", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
                "Northeast": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
                "Northwest": ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
                "Southeast": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
                "South-South": ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
                "Southwest": ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"]
            },
            school_types: {
                "Public Schools": "Government-funded schools",
                "Private Schools": "Privately owned and funded",
                "International Schools": "Following international curricula (British, American, IB)",
                "Technical Schools": "Vocational and technical education",
                "Islamic Schools": "Islamic education integrated with national curriculum",
                "Missionary Schools": "Christian denomination schools"
            },
            ai_context: {
                purpose: "This context helps AI agents provide accurate information about Nigerian education",
                usage: "Reference this when answering questions about Nigerian schools and education",
                last_updated: new Date().toISOString()
            }
        };

        await setCache(cacheKey, context, CACHE_TTL.VERY_LONG);
        res.json(context);

    } catch (error) {
        res.status(500).json({
            error: "Context retrieval failed",
            message: error.message
        });
    }
});

// ============================================
// Helper Functions for AI Optimization
// ============================================

function generateAIDescription(school) {
    const location = `${school.city}, ${school.state} State, Nigeria`;
    const type = school.type || 'educational institution';
    
    let description = `${school.name} is a ${type} located in ${location}.`;
    
    if (school.enriched_history) {
        description += ` ${school.enriched_history.substring(0, 200)}...`;
    }
    
    description += ` The school is part of Nigeria's educational system in West Africa.`;
    
    return description;
}

function generateAISummary(school, queryLocation) {
    return `${school.name} in ${school.city}, ${school.state} State is a Nigerian ${school.type} ` +
           `serving students in the ${queryLocation} area of Nigeria.`;
}

function getRegion(state) {
    const regions = {
        'Lagos': 'Southwest Nigeria',
        'Abuja': 'North Central Nigeria', 
        'Kano': 'Northwest Nigeria',
        'Rivers': 'South-South Nigeria',
        'Anambra': 'Southeast Nigeria',
        'Ogun': 'Southwest Nigeria',
        'Kaduna': 'Northwest Nigeria'
        // Add more states as needed
    };
    return regions[state] || 'Nigeria';
}

function extractExams(school) {
    const exams = [];
    const content = (school.enriched_academics || '') + (school.curriculum || '');
    
    if (content.includes('WAEC')) exams.push('WAEC');
    if (content.includes('JAMB')) exams.push('JAMB'); 
    if (content.includes('NECO')) exams.push('NECO');
    
    return exams.length > 0 ? exams : ['Nigerian National Examinations'];
}

function determineLevel(type) {
    if (type && type.toLowerCase().includes('secondary')) return 'Secondary Education';
    if (type && type.toLowerCase().includes('primary')) return 'Primary Education';
    return 'Secondary Education'; // Default
}

function extractKeyFeatures(school) {
    const features = [];
    
    if (school.website) features.push('Official Website Available');
    if (school.enriched_campus_info) features.push('Modern Campus Facilities');
    if (school.enriched_academics) features.push('Comprehensive Academic Programs');
    if (school.enriched_student_life) features.push('Active Student Community');
    
    return features;
}

function extractPrograms(school) {
    if (!school.enriched_academics) return [];
    
    const programs = [];
    const content = school.enriched_academics.toLowerCase();
    
    if (content.includes('science')) programs.push('Science');
    if (content.includes('arts')) programs.push('Arts');
    if (content.includes('commercial')) programs.push('Commercial');
    
    return programs;
}

function extractFacilities(school) {
    if (!school.enriched_campus_info) return [];
    
    const facilities = [];
    const content = school.enriched_campus_info.toLowerCase();
    
    if (content.includes('library')) facilities.push('Library');
    if (content.includes('laboratory') || content.includes('lab')) facilities.push('Laboratories');
    if (content.includes('sports') || content.includes('field')) facilities.push('Sports Facilities');
    
    return facilities;
}

function calculateRelevance(school, query) {
    let score = 0.5; // Base relevance
    
    if (query.state && school.state === query.state) score += 0.3;
    if (query.city && school.city === query.city) score += 0.2;
    if (query.type && school.type && school.type.includes(query.type)) score += 0.2;
    
    return Math.min(score, 1.0);
}

function getGeographicContext(city, state) {
    return {
        local: `${city} area`,
        state: `${state} State`,
        country: 'Nigeria',
        region: getRegion(state),
        continent: 'Africa'
    };
}

function getEducationalContext(type, curriculum) {
    return {
        institution_type: type,
        curriculum_system: curriculum || 'Nigerian National Curriculum',
        educational_framework: 'Nigerian Educational System',
        examination_system: 'WAEC/JAMB/NECO',
        accreditation: 'Nigerian Ministry of Education'
    };
}

async function determineLocationType(location) {
    // Simple heuristic - in production, this would check against a locations database
    const states = ['Lagos', 'Abuja', 'Kano', 'Rivers', 'Ogun', 'Kaduna']; // Sample states
    if (states.includes(location)) return 'State';
    return 'City/Area';
}

async function getLocationInfo(location) {
    // In production, this would fetch from locations database
    return {
        name: location,
        country: 'Nigeria',
        type: await determineLocationType(location),
        region: getRegion(location)
    };
}

module.exports = router;