"""
Automated SEO Optimization System for Nigerian Schools
=====================================================
Generates SEO-friendly content, meta tags, structured data, and keywords
to maximize search engine visibility and rankings.
"""

import re
import json
import logging
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime
from collections import Counter
import hashlib

logger = logging.getLogger(__name__)

class SEOOptimizer:
    """
    Comprehensive SEO optimization for Nigerian school content
    """
    
    def __init__(self):
        # Nigerian educational context for SEO
        self.nigerian_education_terms = [
            'Nigeria', 'Nigerian', 'education', 'school', 'secondary', 'primary',
            'WAEC', 'JAMB', 'NECO', 'university', 'college', 'academy'
        ]
        
        # GEO optimization for AI engines - Enhanced for maximum visibility
        self.ai_engine_geo_terms = [
            'Nigeria schools', 'Nigerian education system', 'Nigeria educational institutions',
            'West Africa education', 'Sub-Saharan Africa schools', 'African education',
            'Lagos schools Nigeria', 'Abuja schools Nigeria', 'Nigerian secondary education',
            'Nigeria school directory', 'Nigerian school finder', 'Nigeria education guide',
            'best schools in Nigeria', 'top Nigerian schools', 'Nigerian school rankings',
            'Nigeria school admission', 'Nigerian curriculum schools', 'Nigeria exam preparation',
            'WAEC schools Nigeria', 'JAMB preparation Nigeria', 'Nigerian school system'
        ]
        
        # Location-based SEO terms - Enhanced for AI engine discovery
        self.nigerian_locations = {
            'Lagos': ['Lagos State', 'Ikeja', 'Victoria Island', 'Ikoyi', 'Surulere', 'Nigeria commercial capital'],
            'Abuja': ['FCT', 'Federal Capital Territory', 'Garki', 'Maitama', 'Asokoro', 'Nigeria capital city'],
            'Kano': ['Kano State', 'Fagge', 'Nassarawa', 'Gwale', 'Northern Nigeria'],
            'Ibadan': ['Oyo State', 'Bodija', 'Ring Road', 'Mokola', 'Southwest Nigeria'],
            'Port Harcourt': ['Rivers State', 'GRA', 'Trans Amadi', 'Mile 3', 'Niger Delta', 'Oil city Nigeria'],
            'Kaduna': ['Kaduna State', 'Barnawa', 'Sabon Tasha', 'Tudun Wada', 'Northern Nigeria'],
            'Benin City': ['Edo State', 'Ring Road', 'Ikpoba Hill', 'New Benin', 'South-South Nigeria'],
            'Maiduguri': ['Borno State', 'Post Office Area', 'Gwange', 'Monday Market', 'Northeast Nigeria'],
            'Zaria': ['Kaduna State', 'Samaru', 'Sabon Gari', 'City', 'Northern Nigeria educational hub'],
            'Aba': ['Abia State', 'Ariaria', 'Ogbor Hill', 'Cemetery', 'Southeast Nigeria'],
            'Jos': ['Plateau State', 'Rayfield', 'Bukuru', 'Vom', 'Middle Belt Nigeria'],
            'Ilorin': ['Kwara State', 'GRA', 'Tanke', 'Post Office', 'North Central Nigeria'],
            'Enugu': ['Enugu State', 'Independence Layout', 'New Haven', 'Southeast Nigeria coal city'],
            'Warri': ['Delta State', 'Effurun', 'Udu', 'Niger Delta Nigeria'],
            'Calabar': ['Cross River State', 'Tinapa', 'Watt Market', 'South-South Nigeria'],
            'Sokoto': ['Sokoto State', 'Caliphate', 'Northwest Nigeria', 'Sokoto Sultanate'],
            'Minna': ['Niger State', 'Middle Belt Nigeria', 'North Central'],
            'Bauchi': ['Bauchi State', 'Northeast Nigeria', 'Abubakar Tafawa Balewa'],
            'Akure': ['Ondo State', 'Southwest Nigeria', 'Yorubaland'],
            'Owerri': ['Imo State', 'Southeast Nigeria', 'Igboland'],
            'Uyo': ['Akwa Ibom State', 'South-South Nigeria', 'Niger Delta'],
            'Abakaliki': ['Ebonyi State', 'Southeast Nigeria', 'Salt of the nation'],
            'Osogbo': ['Osun State', 'Southwest Nigeria', 'Yorubaland'],
            'Lokoja': ['Kogi State', 'Confluence state', 'North Central Nigeria'],
            'Yenagoa': ['Bayelsa State', 'Niger Delta', 'South-South Nigeria']
        }
        
        # Educational keywords by category
        self.educational_keywords = {
            'academic_programs': [
                'curriculum', 'subjects', 'science', 'arts', 'commercial',
                'mathematics', 'english', 'physics', 'chemistry', 'biology',
                'government', 'economics', 'accounting', 'literature'
            ],
            'school_features': [
                'boarding', 'day school', 'co-educational', 'single-sex',
                'private school', 'public school', 'government school',
                'mission school', 'international school'
            ],
            'facilities': [
                'library', 'laboratory', 'computer room', 'sports facility',
                'hostel', 'dining hall', 'assembly hall', 'playground'
            ],
            'achievements': [
                'excellence', 'awards', 'recognition', 'accreditation',
                'outstanding results', 'academic performance', 'graduation rate'
            ]
        }
        
        # SEO templates
        self.title_templates = {
            'school_main': "{school_name} - {school_type} in {location} | Nigerian Schools Directory",
            'school_academics': "{school_name} Academic Programs | {location} Schools",
            'school_admission': "{school_name} Admission Requirements | Apply to {location} School",
            'location_schools': "Best {school_type}s in {location} | Nigerian Schools Directory"
        }
        
        self.meta_description_templates = {
            'comprehensive': "Discover {school_name}, a leading {school_type} in {location}, Nigeria. Learn about academic programs, facilities, admission requirements and contact information.",
            'academic_focus': "{school_name} offers excellent education in {location}. Explore our academic programs, qualified teachers, and modern facilities. Apply today!",
            'achievement_focus': "Join {school_name}, {location}'s top-rated school known for academic excellence and outstanding student results. Discover why we're the best choice."
        }
    
    
    def generate_seo_title(self, school_name: str, location: str = "", 
                          school_type: str = "school") -> Dict[str, str]:
        """Generate SEO-optimized titles for different page types"""
        
        # Clean and prepare inputs
        school_name = self._clean_school_name(school_name)
        location = self._extract_location(location)
        school_type = self._determine_school_type(school_name, school_type)
        
        titles = {}
        
        # Main school page title
        titles['main'] = self.title_templates['school_main'].format(
            school_name=school_name,
            school_type=school_type,
            location=location
        )
        
        # Academic programs title
        titles['academics'] = self.title_templates['school_academics'].format(
            school_name=school_name,
            location=location
        )
        
        # Admission page title
        titles['admissions'] = self.title_templates['school_admission'].format(
            school_name=school_name,
            location=location
        )
        
        # Ensure titles are within SEO length limits (50-60 characters ideal)
        for key, title in titles.items():
            if len(title) > 60:
                titles[key] = self._truncate_title(title, 60)
        
        return titles
    def generate_meta_description(self, school_name: str, content_dict: Dict[str, str],
                                 location: str = "", school_type: str = "school") -> str:
        """Generate SEO-optimized meta description"""
        
        school_name = self._clean_school_name(school_name)
        location = self._extract_location(location)
        school_type = self._determine_school_type(school_name, school_type)
        
        # Extract key features from content
        key_features = self._extract_key_features(content_dict)
        
        # Choose template based on available information
        if key_features.get('achievements'):
            template = self.meta_description_templates['achievement_focus']
        elif key_features.get('academic_programs'):
            template = self.meta_description_templates['academic_focus']
        else:
            template = self.meta_description_templates['comprehensive']
        
        # Generate base description
        description = template.format(
            school_name=school_name,
            school_type=school_type,
            location=location
        )
        
        # Add key features if space allows
        if len(description) < 140 and key_features:
            feature_text = self._format_key_features(key_features)
            if feature_text:
                description = description.rstrip('.') + f". {feature_text}."
        
        # Ensure within optimal length (150-160 characters)
        if len(description) > 160:
            description = self._truncate_description(description, 160)
        
        return description
    def generate_keywords(self, school_name: str, content_dict: Dict[str, str],
                         location: str = "", school_type: str = "school") -> Dict[str, List[str]]:
        """Generate comprehensive SEO keywords"""
        
        keywords = {
            'primary': [],      # Most important keywords
            'secondary': [],    # Supporting keywords
            'long_tail': [],    # Long-tail keyword phrases
            'local_seo': []     # Location-based keywords
        }
        
        # Clean inputs
        school_name = self._clean_school_name(school_name)
        location = self._extract_location(location)
        school_type = self._determine_school_type(school_name, school_type)
        
        # Primary keywords (most important)
        keywords['primary'].extend([
            school_name,
            f"{school_name} {location}",
            f"{school_type} {location}",
            f"{location} schools",
            f"Nigerian schools"
        ])
        
        # Secondary keywords - Enhanced for AI engine discovery
        keywords['secondary'].extend([
            f"{school_type} Nigeria",
            f"education {location}",
            f"{location} education", 
            "Nigerian education",
            "secondary school Nigeria",
            # AI engine optimization keywords
            f"Nigeria school in {location}",
            f"Nigerian educational institution {location}",
            f"West African schools {location}",
            f"African education {location}",
            "Nigeria school system",
            "Nigerian curriculum"
        ])
        
        # Location-specific keywords
        if location in self.nigerian_locations:
            location_terms = self.nigerian_locations[location]
            for term in location_terms:
                if isinstance(term, str):  # Ensure term is string
                    keywords['local_seo'].extend([
                        f"schools in {term}",
                        f"{term} schools", 
                        f"education {term}"
                    ])
        
        # Content-based keywords - Add safety to prevent nested lists
        content_keywords = self._extract_content_keywords(content_dict)
        # Ensure all content keywords are strings, flatten any nested structures
        safe_content_keywords = []
        for kw in content_keywords[:10]:
            if isinstance(kw, str):
                safe_content_keywords.append(kw)
            elif isinstance(kw, (list, tuple)):
                for item in kw:
                    if isinstance(item, str):
                        safe_content_keywords.append(item)
        keywords['secondary'].extend(safe_content_keywords)
        
        # Long-tail keywords
        keywords['long_tail'].extend([
            f"best {school_type} in {location}",
            f"{school_name} admission requirements",
            f"{school_name} academic programs",
            f"how to apply to {school_name}",
            f"{location} {school_type} with good results"
        ])
        
        # Remove duplicates and clean - handle nested lists/tuples with maximum safety
        for category in keywords:
            cleaned_keywords = []
            try:
                for kw in keywords[category]:
                    try:
                        if isinstance(kw, str) and kw.strip():
                            cleaned_keywords.append(kw.strip())
                        elif isinstance(kw, (list, tuple)):
                            # Flatten nested structures
                            for item in kw:
                                try:
                                    if isinstance(item, str) and item.strip():
                                        cleaned_keywords.append(item.strip())
                                except (AttributeError, TypeError):
                                    continue
                    except (AttributeError, TypeError):
                        continue
                
                # Remove duplicates - ensure all items are strings
                cleaned_keywords = [str(kw) for kw in cleaned_keywords if kw]
                keywords[category] = list(set(cleaned_keywords))
                
            except Exception as e:
                # If there's any error in cleaning, keep the category empty
                keywords[category] = []
        
        return keywords
    def generate_structured_data(self, school_data: Dict[str, Any], 
                               content_dict: Dict[str, str]) -> Dict[str, Any]:
        """Generate JSON-LD structured data for search engines"""
        
        school_name = school_data.get('name', '')
        location = f"{school_data.get('city', '')}, {school_data.get('state', '')}"
        website = school_data.get('website', '')
        
        # Base educational organization schema - Enhanced for AI engines
        structured_data = {
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": school_name,
            "alternateName": self._generate_alternate_names(school_name),
            "description": content_dict.get('enriched_history', '')[:200],
            "url": website if website else f"https://nigeriandirectory.com/schools/{self.generate_url_slug(school_name, location)}",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": school_data.get('city', ''),
                "addressRegion": school_data.get('state', ''),
                "addressCountry": "Nigeria",
                "addressCountryCode": "NG"
            },
            "areaServed": [
                {
                    "@type": "Place", 
                    "name": location
                },
                {
                    "@type": "Place",
                    "name": "Nigeria"
                },
                {
                    "@type": "Place", 
                    "name": "West Africa"
                },
                {
                    "@type": "Place",
                    "name": f"{school_data.get('state', '')} State, Nigeria"
                }
            ],
            "audience": {
                "@type": "EducationalAudience", 
                "educationalRole": "student"
            },
            # Enhanced geographic and regional context for AI engines
            "geo": {
                "@type": "GeoCoordinates",
                "addressCountry": "Nigeria"
            },
            "containedInPlace": {
                "@type": "Country",
                "name": "Nigeria",
                "alternateName": ["Federal Republic of Nigeria", "Nigeria", "NG"]
            },
            "subOrganization": {
                "@type": "EducationalOrganization",
                "parentOrganization": "Nigerian Ministry of Education"
            },
            # AI engine keywords for better discovery
            "keywords": [
                "Nigeria education", "Nigerian school", "West Africa education",
                f"{location} school", f"Nigeria {school_data.get('state', '')}", 
                "African education system", "Nigerian curriculum"
            ]
        }
        
        # Add educational programs if available
        if content_dict.get('enriched_academics'):
            programs = self._extract_academic_programs(content_dict['enriched_academics'])
            if programs:
                structured_data["hasCredential"] = [
                    {
                        "@type": "EducationalOccupationalCredential",
                        "name": program,
                        "educationalLevel": "Secondary Education"
                    } for program in programs[:5]  # Top 5 programs
                ]
        
        # Add facilities if available
        if content_dict.get('enriched_campus_info'):
            facilities = self._extract_facilities(content_dict['enriched_campus_info'])
            if facilities:
                structured_data["amenityFeature"] = [
                    {
                        "@type": "LocationFeatureSpecification",
                        "name": facility
                    } for facility in facilities[:8]  # Top 8 facilities
                ]
        
        return structured_data
    def generate_url_slug(self, school_name: str, location: str = "") -> str:
        """Generate SEO-friendly URL slug"""
        
        slug_parts = []
        
        # Clean school name
        clean_name = self._clean_for_slug(school_name)
        slug_parts.append(clean_name)
        
        # Add location if provided
        if location:
            clean_location = self._clean_for_slug(location)
            slug_parts.append(clean_location)
        
        # Join with hyphens and ensure proper format - add type safety
        slug_parts_clean = []
        for part in slug_parts:
            if isinstance(part, str):
                slug_parts_clean.append(part)
            elif isinstance(part, (list, tuple)):
                # Flatten nested structures
                for item in part:
                    if isinstance(item, str):
                        slug_parts_clean.append(item)
        
        slug = '-'.join(slug_parts_clean)
        slug = re.sub(r'-+', '-', slug)  # Remove multiple hyphens
        slug = slug.strip('-')  # Remove leading/trailing hyphens
        
        return slug.lower()
    
    def optimize_content_for_seo(self, school_data: Dict[str, Any], 
                                content_dict: Dict[str, str]) -> Dict[str, Any]:
        """
        Generate comprehensive SEO optimization for school content
        """
        try:
            school_name = school_data.get('name', '')
            location = school_data.get('city', '') or school_data.get('state', '')
            school_type = self._determine_school_type(school_name)
            
            seo_data = {
                'school_id': school_data.get('id'),
                'school_name': school_name,
                'seo_generated_at': datetime.now().isoformat(),
                'titles': self.generate_seo_title(school_name, location, school_type),
                'meta_description': self.generate_meta_description(school_name, content_dict, location, school_type),
                'keywords': self.generate_keywords(school_name, content_dict, location, school_type),
                'structured_data': self.generate_structured_data(school_data, content_dict),
                'url_slug': self.generate_url_slug(school_name, location),
                'ai_descriptions': self.generate_ai_engine_content(school_data, content_dict),
                'seo_score': 0.0,
                'optimization_notes': []
            }
            
            # Calculate SEO score
            seo_data['seo_score'] = self._calculate_seo_score(seo_data, content_dict)
            
            # Generate optimization recommendations
            seo_data['optimization_notes'] = self._generate_seo_recommendations(seo_data, content_dict)
            
            return seo_data
            
        except Exception as e:
            # Return minimal SEO data if there's any error
            logger.error(f"Error in SEO optimization: {e}")
            return {
                'school_id': school_data.get('id'),
                'school_name': school_data.get('name', ''),
                'seo_generated_at': datetime.now().isoformat(),
                'titles': {'main': school_data.get('name', '')},
                'meta_description': f"School in {school_data.get('city', '')}, {school_data.get('state', '')}, Nigeria",
                'keywords': {'primary': ['Nigeria', 'school']},
                'structured_data': {"@type": "EducationalOrganization", "name": school_data.get('name', '')},
                'url_slug': school_data.get('name', '').lower().replace(' ', '-'),
                'ai_descriptions': {'comprehensive': f"{school_data.get('name', '')} in Nigeria"},
                'seo_score': 0.0,
                'optimization_notes': ['SEO optimization partially unavailable']
            }
    # Helper methods
    def _clean_school_name(self, name: str) -> str:
        """Clean school name for SEO use"""
        # Remove common prefixes/suffixes that might be redundant
        name = re.sub(r'\b(School|College|Academy|Institute)\b$', '', name, flags=re.IGNORECASE)
        return name.strip()
    
    def _extract_location(self, location_str: str) -> str:
        """Extract primary location from location string"""
        if not location_str:
            return "Nigeria"
        
        # Handle "City, State" format
        parts = [p.strip() for p in location_str.split(',')]
        primary_location = parts[0] if parts else location_str
        
        # Check if it's a known major city
        for city in self.nigerian_locations:
            if city.lower() in primary_location.lower():
                return city
        
        return primary_location
    
    def _determine_school_type(self, school_name: str, fallback: str = "school") -> str:
        """Determine school type from name"""
        name_lower = school_name.lower()
        
        if any(term in name_lower for term in ['college', 'university']):
            return "college"
        elif any(term in name_lower for term in ['grammar', 'secondary', 'high']):
            return "secondary school"
        elif any(term in name_lower for term in ['primary', 'elementary']):
            return "primary school"
        elif 'academy' in name_lower:
            return "academy"
        elif 'international' in name_lower:
            return "international school"
        else:
            return fallback
    
    def _extract_key_features(self, content_dict: Dict[str, str]) -> Dict[str, List[str]]:
        """Extract key features from content for SEO"""
        features = {
            'academic_programs': [],
            'facilities': [],
            'achievements': []
        }
        
        all_content = ' '.join(
            v for v in content_dict.values() if isinstance(v, str)
        ).lower()
        
        # Extract academic programs
        for program in self.educational_keywords['academic_programs']:
            if program in all_content:
                features['academic_programs'].append(program)
        
        # Extract facilities
        for facility in self.educational_keywords['facilities']:
            if facility in all_content:
                features['facilities'].append(facility)
        
        # Extract achievements
        for achievement in self.educational_keywords['achievements']:
            if achievement in all_content:
                features['achievements'].append(achievement)
        
        return features
    def _extract_content_keywords(self, content_dict: Dict[str, str]) -> List[str]:
        """Extract keywords from content for SEO"""
        # Combine all content
        all_text = ' '.join(
            v for v in content_dict.values() if isinstance(v, str)
        ).lower()
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'}
        
        # Extract words and count frequency
        words = re.findall(r'\b[a-zA-Z]{3,}\b', all_text)
        words = [word for word in words if word not in stop_words]
        
        # Count word frequency
        word_freq = Counter(words)
        
        # Return top keywords
        return [word for word, freq in word_freq.most_common(20)]
    
    def _generate_alternate_names(self, school_name: str) -> List[str]:
        """Generate alternate names for structured data"""
        alternates = []
        
        # Add common abbreviations
        if 'Grammar School' in school_name:
            alternates.append(school_name.replace('Grammar School', 'G.S.'))
        if 'Secondary School' in school_name:
            alternates.append(school_name.replace('Secondary School', 'S.S.'))
        if 'College' in school_name:
            alternates.append(school_name.replace('College', 'Col.'))
        
        return alternates[:3]  # Maximum 3 alternates
    
    def _extract_academic_programs(self, academic_content: str) -> List[str]:
        """Extract academic programs from content"""
        programs = []
        
        # Common program patterns
        program_patterns = [
            r'(science|arts|commercial)\s+(?:subjects?|programs?)',
            r'(?:offers?|teaches?|provides?)\s+([a-z\s,]+?)(?:\.|,|\band\b)',
            r'(mathematics|english|physics|chemistry|biology|economics|government)'
        ]
        
        content_lower = academic_content.lower()
        
        for pattern in program_patterns:
            matches = re.findall(pattern, content_lower)
            for match in matches:
                if isinstance(match, tuple):
                    # Handle regex groups - take first non-empty group
                    for group in match:
                        if group and isinstance(group, str) and len(group.strip()) > 2:
                            programs.append(group.strip())
                            break
                elif isinstance(match, str) and len(match.strip()) > 2:
                    programs.append(match.strip())
        
        return list(set(programs))[:10]  # Top 10 unique programs
    
    def generate_ai_engine_content(self, school_data: Dict[str, Any], 
                                 content_dict: Dict[str, str]) -> Dict[str, str]:
        """
        Generate content specifically optimized for AI engines (ChatGPT, Claude, Gemini, etc.)
        to ensure Nigerian schools appear in AI responses about education
        """
        
        school_name = school_data.get('name', '')
        city = school_data.get('city', '')
        state = school_data.get('state', '')
        
        # AI-optimized descriptions with geographic context
        ai_descriptions = {
            'comprehensive': f"{school_name} is a Nigerian educational institution located in {city}, {state} State, Nigeria. This school is part of Nigeria's educational system in West Africa and serves students in the {state} region of Nigeria.",
            
            'geographic': f"Located in {city}, {state} State, Nigeria, {school_name} is a prominent educational institution in West Africa. The school serves the Nigerian educational landscape and contributes to education in the {state} region of Nigeria.",
            
            'contextual': f"{school_name} ({city}, Nigeria) is an educational institution in Nigeria's {state} State. As part of the Nigerian education system in West Africa, this school provides educational services to students in {city} and the broader {state} region of Nigeria.",
            
            'regional': f"In {city}, {state} State, Nigeria, {school_name} stands as an important educational institution. This Nigerian school contributes to West Africa's educational landscape and serves the local community in {state} State, Nigeria."
        }
        
        # Add curriculum and system context for AI engines
        curriculum_context = []
        if 'WAEC' in str(content_dict.values()).upper():
            curriculum_context.append("WAEC preparation")
        if 'JAMB' in str(content_dict.values()).upper():
            curriculum_context.append("JAMB preparation")
        if 'NECO' in str(content_dict.values()).upper():
            curriculum_context.append("NECO preparation")
            
        if curriculum_context:
            # Ensure all items are strings
            curriculum_items = [str(item) for item in curriculum_context if item]
            system_info = f" The school follows the Nigerian educational curriculum with focus on {', '.join(curriculum_items)}."
        else:
            system_info = " The school operates within Nigeria's educational framework and curriculum standards."
        
        # Add system info to all descriptions
        for key in ai_descriptions:
            ai_descriptions[key] += system_info
        
        return ai_descriptions
    
    def _extract_facilities(self, campus_content: str) -> List[str]:
        """Extract facilities from content"""
        facilities = []
        
        facility_patterns = [
            r'(library|laboratory|computer\s+room|sports?\s+facility)',
            r'(hostel|dining\s+hall|assembly\s+hall|playground)',
            r'(classroom|office|workshop|studio)'
        ]
        
        content_lower = campus_content.lower()
        
        for pattern in facility_patterns:
            matches = re.findall(pattern, content_lower)
            facilities.extend([match.strip() for match in matches if isinstance(match, str)])
        
        return list(set(facilities))[:10]  # Top 10 unique facilities
    def _clean_for_slug(self, text: str) -> str:
        """Clean text for URL slug"""
        # Convert to lowercase and replace spaces/special chars with hyphens
        text = re.sub(r'[^\w\s-]', '', text.lower())
        text = re.sub(r'[\s_]+', '-', text)
        return text.strip('-')
    
    def _truncate_title(self, title: str, max_length: int) -> str:
        """Truncate title while preserving readability"""
        if len(title) <= max_length:
            return title
        
        # Try to truncate at word boundary
        truncated = title[:max_length].rsplit(' ', 1)[0]
        
        # If too short, use character limit
        if len(truncated) < max_length * 0.8:
            truncated = title[:max_length-3] + "..."
        
        return truncated
    
    def _truncate_description(self, description: str, max_length: int) -> str:
        """Truncate meta description while preserving readability"""
        if len(description) <= max_length:
            return description
        
        # Try to truncate at sentence boundary
        sentences = description.split('. ')
        truncated = sentences[0]
        
        for sentence in sentences[1:]:
            if len(truncated + '. ' + sentence) <= max_length:
                truncated += '. ' + sentence
            else:
                break
        
        # Ensure it ends properly
        if not truncated.endswith('.'):
            truncated += '.'
        
        return truncated
    
    def _format_key_features(self, features: Dict[str, List[str]]) -> str:
        """Format key features into readable text"""
        feature_text = []
        
        if features.get('academic_programs'):
            programs = features['academic_programs'][:2]  # Top 2
            # Ensure all items are strings
            programs = [str(p) for p in programs if p]
            if programs:
                feature_text.append(f"Offers {', '.join(programs)}")
        
        if features.get('facilities'):
            facilities = features['facilities'][:2]  # Top 2
            # Ensure all items are strings
            facilities = [str(f) for f in facilities if f]
            if facilities:
                feature_text.append(f"Features {', '.join(facilities)}")
        
        return '. '.join(feature_text) if feature_text else ""
    def _calculate_seo_score(self, seo_data: Dict[str, Any], content_dict: Dict[str, str]) -> float:
        """Calculate SEO optimization score (0-100)"""
        score = 0.0
        
        # Title optimization (20 points)
        main_title = seo_data.get('titles', {}).get('main', '')
        if main_title:
            if 30 <= len(main_title) <= 60:  # Optimal length
                score += 20
            elif 20 <= len(main_title) <= 70:  # Acceptable length
                score += 15
            else:
                score += 5
        
        # Meta description (20 points)
        meta_desc = seo_data.get('meta_description', '')
        if meta_desc:
            if 120 <= len(meta_desc) <= 160:  # Optimal length
                score += 20
            elif 100 <= len(meta_desc) <= 180:  # Acceptable length
                score += 15
            else:
                score += 10
        
        # Keywords diversity (20 points)
        keywords = seo_data.get('keywords', {})
        total_keywords = sum(len(kw_list) for kw_list in keywords.values())
        if total_keywords >= 20:
            score += 20
        elif total_keywords >= 15:
            score += 15
        elif total_keywords >= 10:
            score += 10
        else:
            score += 5
        
        # Content quality (20 points)
        total_content_length = sum(len(content) for content in content_dict.values())
        if total_content_length >= 1500:
            score += 20
        elif total_content_length >= 1000:
            score += 15
        elif total_content_length >= 500:
            score += 10
        else:
            score += 5
        
        # Structured data completeness (10 points)
        structured_data = seo_data.get('structured_data', {})
        if structured_data.get('@type') == 'EducationalOrganization':
            score += 5
            if structured_data.get('address'):
                score += 2
            if structured_data.get('hasCredential'):
                score += 2
            if structured_data.get('amenityFeature'):
                score += 1
        
        # URL slug quality (10 points)
        slug = seo_data.get('url_slug', '')
        if slug and len(slug) <= 60 and '-' in slug:
            score += 10
        elif slug:
            score += 5
        
        return min(100.0, score)  # Cap at 100
    
    def _generate_seo_recommendations(self, seo_data: Dict[str, Any], 
                                    content_dict: Dict[str, str]) -> List[str]:
        """Generate SEO improvement recommendations"""
        recommendations = []
        
        # Check title length
        main_title = seo_data.get('titles', {}).get('main', '')
        if len(main_title) > 60:
            recommendations.append("Shorten main title to under 60 characters for better search visibility")
        elif len(main_title) < 30:
            recommendations.append("Expand main title to 30-60 characters for better keyword coverage")
        
        # Check meta description
        meta_desc = seo_data.get('meta_description', '')
        if len(meta_desc) > 160:
            recommendations.append("Shorten meta description to 120-160 characters")
        elif len(meta_desc) < 120:
            recommendations.append("Expand meta description to include more compelling details")
        
        # Check content length
        total_content = sum(len(content) for content in content_dict.values())
        if total_content < 1000:
            recommendations.append("Add more detailed content to improve search rankings")
        
        # Check keyword diversity
        keywords = seo_data.get('keywords', {})
        if len(keywords.get('primary', [])) < 5:
            recommendations.append("Add more primary keywords for better search coverage")
        
        # Check location coverage - safely iterate through keywords
        has_location_keywords = False
        try:
            for kw_list in keywords.values():
                if isinstance(kw_list, list):
                    for kw in kw_list:
                        if isinstance(kw, str) and 'nigeria' in kw.lower():
                            has_location_keywords = True
                            break
                if has_location_keywords:
                    break
        except Exception as e:
            logger.warning(f"Error checking location keywords: {e}")
            
        if not has_location_keywords:
            recommendations.append("Include more Nigeria and location-specific keywords")
        
        return recommendations[:5]  # Top 5 recommendations

if __name__ == "__main__":
    # Test the SEO optimizer
    print("Testing SEO Optimization System")
    print("=" * 50)
    
    optimizer = SEOOptimizer()
    
    # Test school data
    test_school = {
        'id': 1,
        'name': 'Lagos State University',
        'city': 'Lagos',
        'state': 'Lagos State',
        'website': 'https://lasu.edu.ng'
    }
    
    # Test content
    test_content = {
        'enriched_history': 'Lagos State University (LASU) was established in 1983 by the Lagos State Government to provide accessible higher education. The university has grown to become one of Nigeria leading state universities with over 100,000 graduates.',
        'enriched_academics': 'LASU offers undergraduate and postgraduate programs across 7 faculties including Engineering, Medicine, Law, and Sciences. The university provides quality education with modern laboratories and qualified faculty.',
        'enriched_campus_info': 'The main campus is located in Ojo, Lagos State, featuring modern buildings, laboratories, library, hostels, and recreational facilities. The campus spans 256 hectares with state-of-the-art infrastructure.',
        'enriched_student_life': 'Students enjoy vibrant campus life with over 50 student clubs, sports teams, cultural activities, and leadership opportunities. The university provides comprehensive student services and support systems.'
    }
    
    print("🧪 Testing SEO optimization...")
    
    # Generate SEO data
    seo_result = optimizer.optimize_content_for_seo(test_school, test_content)
    
    # Display results
    print(f"\n📊 SEO Results for {test_school['name']}")
    print("-" * 40)
    print(f"SEO Score: {seo_result['seo_score']:.1f}/100")
    print(f"URL Slug: {seo_result['url_slug']}")
    
    print(f"\n📝 Titles:")
    for title_type, title in seo_result['titles'].items():
        print(f"  {title_type}: {title} ({len(title)} chars)")
    
    print(f"\n📄 Meta Description:")
    meta_desc = seo_result['meta_description']
    print(f"  {meta_desc} ({len(meta_desc)} chars)")
    
    print(f"\n🔑 Keywords:")
    for category, keywords in seo_result['keywords'].items():
        print(f"  {category}: {len(keywords)} keywords")
        if keywords:
            # Ensure keywords are strings before joining
            keyword_examples = [str(kw) for kw in keywords[:3] if isinstance(kw, str)]
            if keyword_examples:
                print(f"    Examples: {', '.join(keyword_examples)}")
    
    print(f"\n🏗️ Structured Data Type: {seo_result['structured_data'].get('@type', 'None')}")
    
    print(f"\n💡 SEO Recommendations:")
    for i, rec in enumerate(seo_result['optimization_notes'], 1):
        print(f"  {i}. {rec}")
    
    print(f"\n✅ SEO optimization system tested successfully!")