/**
 * Template-based Summary Generator for Schools
 * Generates varied, SEO-friendly summaries using randomized templates per school type
 * Target: 120-150 words per summary
 */

// Template configurations per school type
const TEMPLATES = {
    private: [
        {
            id: 'private_1',
            generate: (s) => `${s.name}, located in ${s.area}, ${s.city}, is a distinguished private school providing ${s.curriculum || 'Nigerian'} curriculum programs for ${s.levels || 'primary and secondary'} students. ${getBoardingText(s)} students benefit from modern facilities and a diverse range of extracurricular activities. ${getPrincipalText(s)}The institution is committed to academic excellence and holistic development, preparing students for future success. ${getFacilitiesText(s)}${getAchievementsText(s)}Parents seeking quality education in ${s.state} will find ${s.name} offers a nurturing environment with experienced educators dedicated to bringing out the best in every child.`
        },
        {
            id: 'private_2',
            generate: (s) => `At ${s.name} in ${s.area}, ${s.city}, students enjoy comprehensive ${s.curriculum || 'Nigerian'} curriculum education for ${s.levels || 'all levels'}. ${getBoardingText(s)} options are available, and the school emphasizes academic excellence and personal growth. ${getPrincipalText(s)}Established as a leading private institution in ${s.state}, the school combines rigorous academics with character development. ${getFacilitiesText(s)}${getAchievementsText(s)}With a focus on innovation and traditional values, ${s.name} prepares young minds for the challenges of tomorrow while fostering a love for learning.`
        },
        {
            id: 'private_3',
            generate: (s) => `${s.name} is a well-established private school in ${s.city}, ${s.area}, offering ${s.curriculum || 'quality'} education to ${s.levels || 'students of various ages'}. The campus fosters a vibrant student community, with ${getBoardingLower(s)} accommodations and top-tier learning resources. ${getPrincipalText(s)}${getFacilitiesText(s)}The school's commitment to excellence is reflected in its comprehensive curriculum and dedicated teaching staff. ${getAchievementsText(s)}Families in ${s.state} trust ${s.name} for its track record of producing well-rounded graduates who excel academically and socially.`
        },
        {
            id: 'private_4',
            generate: (s) => `Discover ${s.name}, a premier private educational institution situated in the heart of ${s.area}, ${s.city}. Offering ${s.curriculum || 'Nigerian'} curriculum for ${s.levels || 'primary through secondary'} levels, the school provides ${getBoardingLower(s)} facilities to accommodate diverse student needs. ${getPrincipalText(s)}${getFacilitiesText(s)}Academic rigor meets creative exploration at ${s.name}, where students are encouraged to think critically and dream big. ${getAchievementsText(s)}Join a community of learners in ${s.state} committed to shaping future leaders.`
        },
        {
            id: 'private_5',
            generate: (s) => `Welcome to ${s.name}, where educational excellence meets personal development in ${s.area}, ${s.city}. This reputable private school delivers ${s.curriculum || 'comprehensive'} education for ${s.levels || 'young learners'}. ${getBoardingText(s)} students enjoy state-of-the-art amenities. ${getPrincipalText(s)}${getFacilitiesText(s)}The dedicated faculty at ${s.name} creates an inspiring atmosphere for academic growth. ${getAchievementsText(s)}As one of ${s.state}'s trusted educational institutions, ${s.name} continues to nurture tomorrow's leaders today.`
        }
    ],

    international: [
        {
            id: 'intl_1',
            generate: (s) => `${s.name} stands as a premier international school in ${s.area}, ${s.city}, offering world-class ${s.curriculum || 'British/American'} curriculum education. Catering to ${s.levels || 'students from early years through secondary'}, the institution provides ${getBoardingLower(s)} options for families across Nigeria and beyond. ${getPrincipalText(s)}With a diverse student body and internationally trained educators, ${s.name} delivers globally recognized qualifications. ${getFacilitiesText(s)}${getAchievementsText(s)}The school's multicultural environment in ${s.state} prepares students for success in universities worldwide.`
        },
        {
            id: 'intl_2',
            generate: (s) => `Experience global education at ${s.name}, an internationally accredited institution in ${s.area}, ${s.city}. The school follows ${s.curriculum || 'international'} curriculum standards for ${s.levels || 'all educational levels'}. ${getBoardingText(s)} facilities ensure students from across Nigeria receive exceptional care. ${getPrincipalText(s)}${getFacilitiesText(s)}${getAchievementsText(s)}As a beacon of international education in ${s.state}, ${s.name} combines rigorous academics with cultural diversity, producing graduates ready for the global stage.`
        },
        {
            id: 'intl_3',
            generate: (s) => `${s.name} brings world-class international education to ${s.city}, ${s.state}. Located in ${s.area}, this prestigious school offers ${s.curriculum || 'Cambridge/IB'} programs for ${s.levels || 'students at all levels'}. ${getBoardingText(s)} arrangements complement the school's comprehensive approach. ${getPrincipalText(s)}${getFacilitiesText(s)}The institution's commitment to excellence attracts families seeking globally competitive education. ${getAchievementsText(s)}Graduates of ${s.name} consistently gain admission to top universities across the world.`
        }
    ],

    public: [
        {
            id: 'public_1',
            generate: (s) => `${s.name} is a respected public school serving the ${s.area} community in ${s.city}, ${s.state}. Following the ${s.curriculum || 'Nigerian national'} curriculum, the school provides quality education for ${s.levels || 'primary and secondary'} students. ${getBoardingText(s)} options may be available for qualifying students. ${getPrincipalText(s)}${getFacilitiesText(s)}Committed to accessible education, ${s.name} has produced numerous successful graduates. ${getAchievementsText(s)}The school remains a cornerstone of educational development in ${s.state}.`
        },
        {
            id: 'public_2',
            generate: (s) => `Serving the educational needs of ${s.area}, ${s.city}, ${s.name} offers ${s.curriculum || 'Nigerian'} curriculum education to ${s.levels || 'students of various levels'}. As a government-supported institution in ${s.state}, the school provides affordable, quality education. ${getBoardingText(s)} accommodations support students from distant areas. ${getPrincipalText(s)}${getFacilitiesText(s)}${getAchievementsText(s)}${s.name} continues to uphold its mission of making quality education accessible to all.`
        }
    ],

    federal: [
        {
            id: 'federal_1',
            generate: (s) => `${s.name} is a prestigious federal government institution located in ${s.area}, ${s.city}. Established as a Unity School, it offers ${s.curriculum || 'Nigerian'} curriculum to ${s.levels || 'secondary school'} students from across Nigeria. ${getBoardingText(s)} facilities promote national unity and cultural exchange. ${getPrincipalText(s)}${getFacilitiesText(s)}Known for academic excellence and discipline, ${s.name} has produced notable alumni. ${getAchievementsText(s)}As one of ${s.state}'s finest federal institutions, it remains a symbol of quality education in Nigeria.`
        },
        {
            id: 'federal_2',
            generate: (s) => `Welcome to ${s.name}, a distinguished Federal Government College in ${s.city}, ${s.state}. Situated in ${s.area}, this Unity School provides ${s.curriculum || 'Nigerian'} education for ${s.levels || 'junior and senior secondary'} students. The ${getBoardingLower(s)} school brings together young Nigerians from all states. ${getPrincipalText(s)}${getFacilitiesText(s)}${getAchievementsText(s)}With a legacy of excellence, ${s.name} continues to shape future leaders for the nation.`
        }
    ],

    boarding: [
        {
            id: 'boarding_1',
            generate: (s) => `${s.name} is a leading boarding school in ${s.area}, ${s.city}, offering full residential education for ${s.levels || 'secondary school'} students. Following the ${s.curriculum || 'Nigerian'} curriculum, the school provides 24-hour supervision and structured learning. ${getPrincipalText(s)}${getFacilitiesText(s)}The boarding environment at ${s.name} develops independence, discipline, and lifelong friendships. ${getAchievementsText(s)}Parents in ${s.state} and beyond trust ${s.name} for comprehensive education in a safe, nurturing residential setting.`
        },
        {
            id: 'boarding_2',
            generate: (s) => `Experience the benefits of residential education at ${s.name}, a premier boarding institution in ${s.city}, ${s.state}. Located in ${s.area}, the school provides ${s.curriculum || 'quality'} education for ${s.levels || 'students'} in a structured, supportive environment. ${getPrincipalText(s)}${getFacilitiesText(s)}${getAchievementsText(s)}The boarding facilities at ${s.name} ensure students receive round-the-clock care while developing essential life skills and academic excellence.`
        }
    ],

    mission: [
        {
            id: 'mission_1',
            generate: (s) => `${s.name} is a faith-based educational institution in ${s.area}, ${s.city}, combining academic excellence with moral and spiritual development. Offering ${s.curriculum || 'Nigerian'} curriculum for ${s.levels || 'primary and secondary'} students, the school instills strong values. ${getBoardingText(s)} options are available. ${getPrincipalText(s)}${getFacilitiesText(s)}${getAchievementsText(s)}As a mission school in ${s.state}, ${s.name} nurtures well-rounded individuals grounded in faith and prepared for life's challenges.`
        }
    ],

    default: [
        {
            id: 'default_1',
            generate: (s) => `${s.name} is an educational institution located in ${s.area}, ${s.city}, ${s.state}. The school offers ${s.curriculum || 'Nigerian'} curriculum programs for ${s.levels || 'students'}, providing quality education in a conducive learning environment. ${getBoardingText(s)} facilities may be available. ${getPrincipalText(s)}${getFacilitiesText(s)}${getAchievementsText(s)}Dedicated to student success, ${s.name} continues to make a positive impact in the educational landscape of ${s.state}.`
        },
        {
            id: 'default_2',
            generate: (s) => `Discover ${s.name}, serving students in ${s.area}, ${s.city}. This ${s.type || 'established'} school provides ${s.curriculum || 'comprehensive'} education for ${s.levels || 'learners of various ages'}. ${getBoardingText(s)} options complement the day program. ${getPrincipalText(s)}${getFacilitiesText(s)}${getAchievementsText(s)}${s.name} is committed to nurturing academic achievement and personal growth in ${s.state}.`
        }
    ]
};

// Helper functions for dynamic content
function getBoardingText(school) {
    if (school.boarding && school.day_school) {
        return 'Both boarding and day';
    } else if (school.boarding) {
        return 'Boarding';
    } else {
        return 'Day';
    }
}

function getBoardingLower(school) {
    if (school.boarding && school.day_school) {
        return 'both boarding and day';
    } else if (school.boarding) {
        return 'boarding';
    } else {
        return 'day';
    }
}

function getPrincipalText(school) {
    if (school.principal_name) {
        const title = school.principal_title || 'Principal';
        return `Under the leadership of ${title} ${school.principal_name}, the school maintains high standards. `;
    }
    return '';
}

function getFacilitiesText(school) {
    if (school.facilities && school.facilities.length > 0) {
        const facilityList = school.facilities.slice(0, 3).join(', ');
        return `Facilities include ${facilityList}. `;
    }
    return '';
}

function getAchievementsText(school) {
    if (school.achievements && school.achievements.length > 0) {
        return `Notable achievements include ${school.achievements[0]}. `;
    }
    return '';
}

/**
 * Generate a template-based summary for a school
 * @param {Object} school - School data object
 * @returns {Object} - { summary: string, templateId: string }
 */
function generateSummary(school) {
    // Determine template category based on school type
    let templateCategory = 'default';
    
    if (school.type) {
        const type = school.type.toLowerCase();
        if (type === 'international') {
            templateCategory = 'international';
        } else if (type === 'private') {
            templateCategory = school.boarding ? 'boarding' : 'private';
        } else if (type === 'public' || type === 'state') {
            templateCategory = 'public';
        } else if (type === 'federal') {
            templateCategory = 'federal';
        } else if (type === 'mission') {
            templateCategory = 'mission';
        } else if (TEMPLATES[type]) {
            templateCategory = type;
        }
    }
    
    // Special case: prioritize boarding template for boarding schools
    if (school.boarding && !school.day_school && templateCategory !== 'federal') {
        templateCategory = 'boarding';
    }

    const templates = TEMPLATES[templateCategory] || TEMPLATES.default;
    
    // Randomly select a template
    const randomIndex = Math.floor(Math.random() * templates.length);
    const template = templates[randomIndex];
    
    // Generate summary
    const summary = template.generate(school);
    
    return {
        summary: summary.trim(),
        templateId: template.id
    };
}

/**
 * Generate meta title for school
 */
function generateMetaTitle(school) {
    return `${school.name}, ${school.area}, ${school.city} - School Profile | NigerianDirectory`;
}

/**
 * Generate meta description for school
 */
function generateMetaDescription(school) {
    const type = school.type ? `${school.type} ` : '';
    return `Discover ${school.name}, a ${type}school in ${school.area}, ${school.city}, ${school.state}. Learn about programs, fees, facilities, and admissions. Find verified school information.`;
}

/**
 * Generate blog page meta title
 */
function generateBlogMetaTitle(school) {
    return `${school.name}, ${school.area}, ${school.city} – Profile, Updates & Highlights`;
}

/**
 * Generate blog page meta description
 */
function generateBlogMetaDescription(school) {
    return `Explore ${school.name} in ${school.area}, ${school.city}. Learn about its programs, leadership, student life, and achievements.`;
}

/**
 * Generate alt text for school images
 */
function generateImageAltText(school, imageType = 'main') {
    const baseAlt = `${school.name} ${school.area} ${school.city}`;
    const altTexts = {
        main: `${baseAlt} School Building`,
        logo: `${baseAlt} Logo`,
        classroom: `${baseAlt} Classroom`,
        campus: `${baseAlt} Campus`,
        facilities: `${baseAlt} Facilities`,
        students: `${baseAlt} Students`,
        principal: `${school.principal_name || 'Principal'} ${baseAlt}`
    };
    return altTexts[imageType] || baseAlt;
}

module.exports = {
    generateSummary,
    generateMetaTitle,
    generateMetaDescription,
    generateBlogMetaTitle,
    generateBlogMetaDescription,
    generateImageAltText,
    TEMPLATES
};
