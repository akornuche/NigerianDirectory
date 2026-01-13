"""
Template-based Summary Enrichment for Schools
Generates varied, SEO-friendly summaries using randomized templates per school type
Target: 120-150 words per summary
"""
import random

# Template configurations per school type
TEMPLATES = {
    'private': [
        {
            'id': 'private_1',
            'template': "{name}, located in {area}, {city}, is a distinguished private school providing {curriculum} curriculum programs for {levels} students. {boarding_text} students benefit from modern facilities and a diverse range of extracurricular activities. {principal_text}The institution is committed to academic excellence and holistic development, preparing students for future success. {facilities_text}{achievements_text}Parents seeking quality education in {state} will find {name} offers a nurturing environment with experienced educators dedicated to bringing out the best in every child."
        },
        {
            'id': 'private_2',
            'template': "At {name} in {area}, {city}, students enjoy comprehensive {curriculum} curriculum education for {levels}. {boarding_text} options are available, and the school emphasizes academic excellence and personal growth. {principal_text}Established as a leading private institution in {state}, the school combines rigorous academics with character development. {facilities_text}{achievements_text}With a focus on innovation and traditional values, {name} prepares young minds for the challenges of tomorrow while fostering a love for learning."
        },
        {
            'id': 'private_3',
            'template': "{name} is a well-established private school in {city}, {area}, offering {curriculum} education to {levels}. The campus fosters a vibrant student community, with {boarding_lower} accommodations and top-tier learning resources. {principal_text}{facilities_text}The school's commitment to excellence is reflected in its comprehensive curriculum and dedicated teaching staff. {achievements_text}Families in {state} trust {name} for its track record of producing well-rounded graduates who excel academically and socially."
        },
        {
            'id': 'private_4',
            'template': "Discover {name}, a premier private educational institution situated in the heart of {area}, {city}. Offering {curriculum} curriculum for {levels}, the school provides {boarding_lower} facilities to accommodate diverse student needs. {principal_text}{facilities_text}Academic rigor meets creative exploration at {name}, where students are encouraged to think critically and dream big. {achievements_text}Join a community of learners in {state} committed to shaping future leaders."
        },
        {
            'id': 'private_5',
            'template': "Welcome to {name}, where educational excellence meets personal development in {area}, {city}. This reputable private school delivers {curriculum} education for {levels}. {boarding_text} students enjoy state-of-the-art amenities. {principal_text}{facilities_text}The dedicated faculty at {name} creates an inspiring atmosphere for academic growth. {achievements_text}As one of {state}'s trusted educational institutions, {name} continues to nurture tomorrow's leaders today."
        }
    ],
    
    'international': [
        {
            'id': 'intl_1',
            'template': "{name} stands as a premier international school in {area}, {city}, offering world-class {curriculum} curriculum education. Catering to {levels}, the institution provides {boarding_lower} options for families across Nigeria and beyond. {principal_text}With a diverse student body and internationally trained educators, {name} delivers globally recognized qualifications. {facilities_text}{achievements_text}The school's multicultural environment in {state} prepares students for success in universities worldwide."
        },
        {
            'id': 'intl_2',
            'template': "Experience global education at {name}, an internationally accredited institution in {area}, {city}. The school follows {curriculum} curriculum standards for {levels}. {boarding_text} facilities ensure students from across Nigeria receive exceptional care. {principal_text}{facilities_text}{achievements_text}As a beacon of international education in {state}, {name} combines rigorous academics with cultural diversity, producing graduates ready for the global stage."
        },
        {
            'id': 'intl_3',
            'template': "{name} brings world-class international education to {city}, {state}. Located in {area}, this prestigious school offers {curriculum} programs for {levels}. {boarding_text} arrangements complement the school's comprehensive approach. {principal_text}{facilities_text}The institution's commitment to excellence attracts families seeking globally competitive education. {achievements_text}Graduates of {name} consistently gain admission to top universities across the world."
        }
    ],
    
    'public': [
        {
            'id': 'public_1',
            'template': "{name} is a respected public school serving the {area} community in {city}, {state}. Following the {curriculum} curriculum, the school provides quality education for {levels} students. {boarding_text} options may be available for qualifying students. {principal_text}{facilities_text}Committed to accessible education, {name} has produced numerous successful graduates. {achievements_text}The school remains a cornerstone of educational development in {state}."
        },
        {
            'id': 'public_2',
            'template': "Serving the educational needs of {area}, {city}, {name} offers {curriculum} curriculum education to {levels}. As a government-supported institution in {state}, the school provides affordable, quality education. {boarding_text} accommodations support students from distant areas. {principal_text}{facilities_text}{achievements_text}{name} continues to uphold its mission of making quality education accessible to all."
        }
    ],
    
    'federal': [
        {
            'id': 'federal_1',
            'template': "{name} is a prestigious federal government institution located in {area}, {city}. Established as a Unity School, it offers {curriculum} curriculum to {levels} students from across Nigeria. {boarding_text} facilities promote national unity and cultural exchange. {principal_text}{facilities_text}Known for academic excellence and discipline, {name} has produced notable alumni. {achievements_text}As one of {state}'s finest federal institutions, it remains a symbol of quality education in Nigeria."
        },
        {
            'id': 'federal_2',
            'template': "Welcome to {name}, a distinguished Federal Government College in {city}, {state}. Situated in {area}, this Unity School provides {curriculum} education for {levels} students. The {boarding_lower} school brings together young Nigerians from all states. {principal_text}{facilities_text}{achievements_text}With a legacy of excellence, {name} continues to shape future leaders for the nation."
        }
    ],
    
    'boarding': [
        {
            'id': 'boarding_1',
            'template': "{name} is a leading boarding school in {area}, {city}, offering full residential education for {levels} students. Following the {curriculum} curriculum, the school provides 24-hour supervision and structured learning. {principal_text}{facilities_text}The boarding environment at {name} develops independence, discipline, and lifelong friendships. {achievements_text}Parents in {state} and beyond trust {name} for comprehensive education in a safe, nurturing residential setting."
        },
        {
            'id': 'boarding_2',
            'template': "Experience the benefits of residential education at {name}, a premier boarding institution in {city}, {state}. Located in {area}, the school provides {curriculum} education for {levels} in a structured, supportive environment. {principal_text}{facilities_text}{achievements_text}The boarding facilities at {name} ensure students receive round-the-clock care while developing essential life skills and academic excellence."
        }
    ],
    
    'mission': [
        {
            'id': 'mission_1',
            'template': "{name} is a faith-based educational institution in {area}, {city}, combining academic excellence with moral and spiritual development. Offering {curriculum} curriculum for {levels} students, the school instills strong values. {boarding_text} options are available. {principal_text}{facilities_text}{achievements_text}As a mission school in {state}, {name} nurtures well-rounded individuals grounded in faith and prepared for life's challenges."
        },
        {
            'id': 'mission_2',
            'template': "Founded on Christian/faith-based principles, {name} serves students in {area}, {city}, with {curriculum} education for {levels}. {boarding_text} facilities create a wholesome environment for learning and growth. {principal_text}{facilities_text}The school's mission extends beyond academics to character formation and spiritual development. {achievements_text}{name} is recognized as one of {state}'s distinguished mission schools."
        }
    ],
    
    'default': [
        {
            'id': 'default_1',
            'template': "{name} is an educational institution located in {area}, {city}, {state}. The school offers {curriculum} curriculum programs for {levels}, providing quality education in a conducive learning environment. {boarding_text} facilities may be available. {principal_text}{facilities_text}{achievements_text}Dedicated to student success, {name} continues to make a positive impact in the educational landscape of {state}."
        },
        {
            'id': 'default_2',
            'template': "Discover {name}, serving students in {area}, {city}. This {type} school provides {curriculum} education for {levels}. {boarding_text} options complement the day program. {principal_text}{facilities_text}{achievements_text}{name} is committed to nurturing academic achievement and personal growth in {state}."
        }
    ]
}


def format_curriculum(curriculum):
    """Format curriculum, handling both string and list"""
    if not curriculum:
        return 'Nigerian'
    if isinstance(curriculum, str):
        return curriculum
    # It's a list - join items
    return ', '.join(curriculum) if curriculum else 'Nigerian'


def format_levels(levels):
    """Format levels, handling both string and list"""
    if not levels:
        return 'students'
    if isinstance(levels, str):
        return levels
    # It's a list - join items  
    return ', '.join(levels) if levels else 'students'


def get_boarding_text(school):
    """Generate boarding status text"""
    boarding = school.get('boarding', False)
    day_school = school.get('day_school', True)
    
    if boarding and day_school:
        return 'Both boarding and day'
    elif boarding:
        return 'Boarding'
    else:
        return 'Day'


def get_boarding_lower(school):
    """Generate boarding status text (lowercase)"""
    boarding = school.get('boarding', False)
    day_school = school.get('day_school', True)
    
    if boarding and day_school:
        return 'both boarding and day'
    elif boarding:
        return 'boarding'
    else:
        return 'day'


def get_principal_text(school):
    """Generate principal text"""
    principal_name = school.get('principal_name')
    if principal_name:
        title = school.get('principal_title', 'Principal')
        return f"Under the leadership of {title} {principal_name}, the school maintains high standards. "
    return ''


def get_facilities_text(school):
    """Generate facilities text"""
    facilities = school.get('facilities', [])
    if facilities and len(facilities) > 0:
        facility_list = ', '.join(facilities[:3])
        return f"Facilities include {facility_list}. "
    return ''


def get_achievements_text(school):
    """Generate achievements text"""
    achievements = school.get('achievements', [])
    if achievements and len(achievements) > 0:
        return f"Notable achievements include {achievements[0]}. "
    return ''


def generate_summary(school):
    """
    Generate a template-based summary for a school
    
    Args:
        school: dict with school data
        
    Returns:
        tuple: (summary, template_id)
    """
    # Determine template category based on school type
    school_type = school.get('type', '').lower()
    template_category = 'default'
    
    if school_type == 'international':
        template_category = 'international'
    elif school_type == 'private':
        template_category = 'boarding' if school.get('boarding') and not school.get('day_school') else 'private'
    elif school_type in ['public', 'state']:
        template_category = 'public'
    elif school_type == 'federal':
        template_category = 'federal'
    elif school_type == 'mission':
        template_category = 'mission'
    elif school_type in TEMPLATES:
        template_category = school_type
    
    # Special case: prioritize boarding template for boarding-only schools
    if school.get('boarding') and not school.get('day_school') and template_category not in ['federal']:
        template_category = 'boarding'
    
    templates = TEMPLATES.get(template_category, TEMPLATES['default'])
    
    # Randomly select a template
    template_data = random.choice(templates)
    template = template_data['template']
    template_id = template_data['id']
    
    # Prepare template variables
    variables = {
        'name': school.get('name', 'The school'),
        'area': school.get('area', 'the area'),
        'city': school.get('city', school.get('state', 'Nigeria')),
        'state': school.get('state', 'Nigeria'),
        'type': school.get('type', 'established'),
        'curriculum': format_curriculum(school.get('curriculum')),
        'levels': format_levels(school.get('levels')),
        'boarding_text': get_boarding_text(school),
        'boarding_lower': get_boarding_lower(school),
        'principal_text': get_principal_text(school),
        'facilities_text': get_facilities_text(school),
        'achievements_text': get_achievements_text(school),
    }
    
    # Generate summary
    summary = template.format(**variables)
    
    return summary.strip(), template_id


def generate_meta_title(school):
    """Generate SEO meta title"""
    name = school.get('name', 'School')
    area = school.get('area', '')
    city = school.get('city', school.get('state', 'Nigeria'))
    return f"{name}, {area}, {city} - School Profile | NigerianDirectory"


def generate_meta_description(school):
    """Generate SEO meta description"""
    name = school.get('name', 'This school')
    school_type = school.get('type', '')
    type_text = f"{school_type} " if school_type else ''
    area = school.get('area', '')
    city = school.get('city', '')
    state = school.get('state', 'Nigeria')
    
    return f"Discover {name}, a {type_text}school in {area}, {city}, {state}. Learn about programs, fees, facilities, and admissions. Find verified school information."


def generate_blog_meta_title(school):
    """Generate blog page meta title"""
    name = school.get('name', 'School')
    area = school.get('area', '')
    city = school.get('city', school.get('state', 'Nigeria'))
    return f"{name}, {area}, {city} – Profile, Updates & Highlights"


def generate_blog_meta_description(school):
    """Generate blog page meta description"""
    name = school.get('name', 'This school')
    area = school.get('area', '')
    city = school.get('city', school.get('state', 'Nigeria'))
    return f"Explore {name} in {area}, {city}. Learn about its programs, leadership, student life, and achievements."


def generate_image_alt_text(school, image_type='main'):
    """Generate alt text for images"""
    name = school.get('name', 'School')
    area = school.get('area', '')
    city = school.get('city', '')
    
    base_alt = f"{name} {area} {city}".strip()
    
    alt_texts = {
        'main': f"{base_alt} School Building",
        'logo': f"{base_alt} Logo",
        'classroom': f"{base_alt} Classroom",
        'campus': f"{base_alt} Campus",
        'facilities': f"{base_alt} Facilities",
        'students': f"{base_alt} Students",
        'principal': f"{school.get('principal_name', 'Principal')} {base_alt}"
    }
    
    return alt_texts.get(image_type, base_alt)
