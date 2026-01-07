/**
 * Nigerian Locations Seed Data
 * Includes 36 states + FCT with major cities and areas
 */

const nigerianLocations = [
    // ============================================
    // LAGOS STATE - Major Commercial Hub
    // ============================================
    { state: 'Lagos', city: 'Lagos', area: 'Lekki', slug: 'lagos-lekki', is_major_city: true, latitude: 6.4698, longitude: 3.5852 },
    { state: 'Lagos', city: 'Lagos', area: 'Ikeja', slug: 'lagos-ikeja', is_major_city: true, latitude: 6.6018, longitude: 3.3515 },
    { state: 'Lagos', city: 'Lagos', area: 'Victoria Island', slug: 'lagos-victoria-island', is_major_city: true, latitude: 6.4281, longitude: 3.4219 },
    { state: 'Lagos', city: 'Lagos', area: 'Ikoyi', slug: 'lagos-ikoyi', is_major_city: true, latitude: 6.4549, longitude: 3.4365 },
    { state: 'Lagos', city: 'Lagos', area: 'Ajah', slug: 'lagos-ajah', is_major_city: true, latitude: 6.4698, longitude: 3.5714 },
    { state: 'Lagos', city: 'Lagos', area: 'Yaba', slug: 'lagos-yaba', is_major_city: true, latitude: 6.5095, longitude: 3.3711 },
    { state: 'Lagos', city: 'Lagos', area: 'Surulere', slug: 'lagos-surulere', is_major_city: true, latitude: 6.5059, longitude: 3.3509 },
    { state: 'Lagos', city: 'Lagos', area: 'Maryland', slug: 'lagos-maryland', is_major_city: true, latitude: 6.5679, longitude: 3.3636 },
    { state: 'Lagos', city: 'Lagos', area: 'Magodo', slug: 'lagos-magodo', is_major_city: true, latitude: 6.6154, longitude: 3.3838 },
    { state: 'Lagos', city: 'Lagos', area: 'Gbagada', slug: 'lagos-gbagada', is_major_city: true, latitude: 6.5527, longitude: 3.3892 },
    { state: 'Lagos', city: 'Lagos', area: 'Festac', slug: 'lagos-festac', is_major_city: true, latitude: 6.4653, longitude: 3.2836 },
    { state: 'Lagos', city: 'Lagos', area: 'Apapa', slug: 'lagos-apapa', is_major_city: true, latitude: 6.4488, longitude: 3.3594 },
    { state: 'Lagos', city: 'Lagos', area: 'Ikorodu', slug: 'lagos-ikorodu', is_major_city: true, latitude: 6.6194, longitude: 3.5105 },
    { state: 'Lagos', city: 'Lagos', area: 'Badagry', slug: 'lagos-badagry', is_major_city: true, latitude: 6.4151, longitude: 2.8814 },
    { state: 'Lagos', city: 'Lagos', area: 'Epe', slug: 'lagos-epe', is_major_city: true, latitude: 6.5852, longitude: 3.9791 },
    { state: 'Lagos', city: 'Lagos', area: 'Oshodi', slug: 'lagos-oshodi', is_major_city: true, latitude: 6.5568, longitude: 3.3414 },
    { state: 'Lagos', city: 'Lagos', area: 'Mushin', slug: 'lagos-mushin', is_major_city: true, latitude: 6.5369, longitude: 3.3544 },
    { state: 'Lagos', city: 'Lagos', area: 'Ojodu', slug: 'lagos-ojodu', is_major_city: true, latitude: 6.6354, longitude: 3.3636 },

    // ============================================
    // FCT ABUJA - Capital Territory
    // ============================================
    { state: 'FCT', city: 'Abuja', area: 'Garki', slug: 'abuja-garki', is_major_city: true, latitude: 9.0322, longitude: 7.4856 },
    { state: 'FCT', city: 'Abuja', area: 'Wuse', slug: 'abuja-wuse', is_major_city: true, latitude: 9.0765, longitude: 7.4898 },
    { state: 'FCT', city: 'Abuja', area: 'Maitama', slug: 'abuja-maitama', is_major_city: true, latitude: 9.0852, longitude: 7.4951 },
    { state: 'FCT', city: 'Abuja', area: 'Asokoro', slug: 'abuja-asokoro', is_major_city: true, latitude: 9.0401, longitude: 7.5276 },
    { state: 'FCT', city: 'Abuja', area: 'Gwarinpa', slug: 'abuja-gwarinpa', is_major_city: true, latitude: 9.1089, longitude: 7.4080 },
    { state: 'FCT', city: 'Abuja', area: 'Jabi', slug: 'abuja-jabi', is_major_city: true, latitude: 9.0747, longitude: 7.4224 },
    { state: 'FCT', city: 'Abuja', area: 'Kubwa', slug: 'abuja-kubwa', is_major_city: true, latitude: 9.1557, longitude: 7.3211 },
    { state: 'FCT', city: 'Abuja', area: 'Lugbe', slug: 'abuja-lugbe', is_major_city: true, latitude: 8.9742, longitude: 7.3794 },
    { state: 'FCT', city: 'Abuja', area: 'Lokogoma', slug: 'abuja-lokogoma', is_major_city: true, latitude: 8.9621, longitude: 7.4152 },
    { state: 'FCT', city: 'Abuja', area: 'Karu', slug: 'abuja-karu', is_major_city: true, latitude: 9.0038, longitude: 7.5844 },
    { state: 'FCT', city: 'Abuja', area: 'Nyanya', slug: 'abuja-nyanya', is_major_city: true, latitude: 8.9961, longitude: 7.5653 },
    { state: 'FCT', city: 'Abuja', area: 'Central Area', slug: 'abuja-central-area', is_major_city: true, latitude: 9.0579, longitude: 7.4951 },

    // ============================================
    // RIVERS STATE
    // ============================================
    { state: 'Rivers', city: 'Port Harcourt', area: 'GRA', slug: 'port-harcourt-gra', is_major_city: true, latitude: 4.8156, longitude: 7.0498 },
    { state: 'Rivers', city: 'Port Harcourt', area: 'Trans Amadi', slug: 'port-harcourt-trans-amadi', is_major_city: true, latitude: 4.8245, longitude: 7.0312 },
    { state: 'Rivers', city: 'Port Harcourt', area: 'Rumuola', slug: 'port-harcourt-rumuola', is_major_city: true, latitude: 4.8367, longitude: 7.0124 },
    { state: 'Rivers', city: 'Port Harcourt', area: 'Eleme', slug: 'port-harcourt-eleme', is_major_city: true, latitude: 4.7801, longitude: 7.1245 },
    { state: 'Rivers', city: 'Port Harcourt', area: 'Diobu', slug: 'port-harcourt-diobu', is_major_city: true, latitude: 4.7756, longitude: 7.0156 },

    // ============================================
    // OYO STATE
    // ============================================
    { state: 'Oyo', city: 'Ibadan', area: 'Bodija', slug: 'ibadan-bodija', is_major_city: true, latitude: 7.4279, longitude: 3.9179 },
    { state: 'Oyo', city: 'Ibadan', area: 'Dugbe', slug: 'ibadan-dugbe', is_major_city: true, latitude: 7.3878, longitude: 3.8789 },
    { state: 'Oyo', city: 'Ibadan', area: 'Ring Road', slug: 'ibadan-ring-road', is_major_city: true, latitude: 7.3956, longitude: 3.9012 },
    { state: 'Oyo', city: 'Ibadan', area: 'Challenge', slug: 'ibadan-challenge', is_major_city: true, latitude: 7.3567, longitude: 3.8678 },
    { state: 'Oyo', city: 'Ibadan', area: 'Mokola', slug: 'ibadan-mokola', is_major_city: true, latitude: 7.4012, longitude: 3.8923 },
    { state: 'Oyo', city: 'Ibadan', area: 'Agodi', slug: 'ibadan-agodi', is_major_city: true, latitude: 7.4145, longitude: 3.9056 },

    // ============================================
    // KANO STATE
    // ============================================
    { state: 'Kano', city: 'Kano', area: 'Sabon Gari', slug: 'kano-sabon-gari', is_major_city: true, latitude: 12.0022, longitude: 8.5167 },
    { state: 'Kano', city: 'Kano', area: 'Nassarawa', slug: 'kano-nassarawa', is_major_city: true, latitude: 11.9874, longitude: 8.5234 },
    { state: 'Kano', city: 'Kano', area: 'Bompai', slug: 'kano-bompai', is_major_city: true, latitude: 12.0189, longitude: 8.5067 },
    { state: 'Kano', city: 'Kano', area: 'Fagge', slug: 'kano-fagge', is_major_city: true, latitude: 11.9956, longitude: 8.5312 },

    // ============================================
    // KADUNA STATE
    // ============================================
    { state: 'Kaduna', city: 'Kaduna', area: 'Kaduna North', slug: 'kaduna-north', is_major_city: true, latitude: 10.5264, longitude: 7.4388 },
    { state: 'Kaduna', city: 'Kaduna', area: 'Kaduna South', slug: 'kaduna-south', is_major_city: true, latitude: 10.4956, longitude: 7.4312 },
    { state: 'Kaduna', city: 'Kaduna', area: 'Barnawa', slug: 'kaduna-barnawa', is_major_city: true, latitude: 10.4789, longitude: 7.4456 },
    { state: 'Kaduna', city: 'Kaduna', area: 'Malali', slug: 'kaduna-malali', is_major_city: true, latitude: 10.5178, longitude: 7.4234 },
    { state: 'Kaduna', city: 'Zaria', area: 'Zaria', slug: 'kaduna-zaria', is_major_city: true, latitude: 11.0855, longitude: 7.7199 },

    // ============================================
    // DELTA STATE
    // ============================================
    { state: 'Delta', city: 'Warri', area: 'Warri', slug: 'delta-warri', is_major_city: true, latitude: 5.5167, longitude: 5.7500 },
    { state: 'Delta', city: 'Asaba', area: 'Asaba', slug: 'delta-asaba', is_major_city: true, latitude: 6.2000, longitude: 6.7333 },
    { state: 'Delta', city: 'Sapele', area: 'Sapele', slug: 'delta-sapele', is_major_city: true, latitude: 5.8903, longitude: 5.6769 },

    // ============================================
    // EDO STATE
    // ============================================
    { state: 'Edo', city: 'Benin City', area: 'GRA', slug: 'benin-city-gra', is_major_city: true, latitude: 6.3350, longitude: 5.6037 },
    { state: 'Edo', city: 'Benin City', area: 'Ugbowo', slug: 'benin-city-ugbowo', is_major_city: true, latitude: 6.3567, longitude: 5.6189 },
    { state: 'Edo', city: 'Benin City', area: 'Ring Road', slug: 'benin-city-ring-road', is_major_city: true, latitude: 6.3234, longitude: 5.6123 },

    // ============================================
    // ENUGU STATE
    // ============================================
    { state: 'Enugu', city: 'Enugu', area: 'Independence Layout', slug: 'enugu-independence-layout', is_major_city: true, latitude: 6.4584, longitude: 7.5464 },
    { state: 'Enugu', city: 'Enugu', area: 'GRA', slug: 'enugu-gra', is_major_city: true, latitude: 6.4412, longitude: 7.5012 },
    { state: 'Enugu', city: 'Enugu', area: 'New Haven', slug: 'enugu-new-haven', is_major_city: true, latitude: 6.4523, longitude: 7.5189 },
    { state: 'Enugu', city: 'Nsukka', area: 'Nsukka', slug: 'enugu-nsukka', is_major_city: true, latitude: 6.8578, longitude: 7.3961 },

    // ============================================
    // ANAMBRA STATE
    // ============================================
    { state: 'Anambra', city: 'Awka', area: 'Awka', slug: 'anambra-awka', is_major_city: true, latitude: 6.2109, longitude: 7.0741 },
    { state: 'Anambra', city: 'Onitsha', area: 'Onitsha', slug: 'anambra-onitsha', is_major_city: true, latitude: 6.1667, longitude: 6.7833 },
    { state: 'Anambra', city: 'Nnewi', area: 'Nnewi', slug: 'anambra-nnewi', is_major_city: true, latitude: 6.0167, longitude: 6.9167 },

    // ============================================
    // ABIA STATE
    // ============================================
    { state: 'Abia', city: 'Aba', area: 'Aba', slug: 'abia-aba', is_major_city: true, latitude: 5.1067, longitude: 7.3667 },
    { state: 'Abia', city: 'Umuahia', area: 'Umuahia', slug: 'abia-umuahia', is_major_city: true, latitude: 5.5327, longitude: 7.4863 },

    // ============================================
    // IMO STATE
    // ============================================
    { state: 'Imo', city: 'Owerri', area: 'Owerri', slug: 'imo-owerri', is_major_city: true, latitude: 5.4851, longitude: 7.0352 },
    { state: 'Imo', city: 'Owerri', area: 'New Owerri', slug: 'imo-new-owerri', is_major_city: true, latitude: 5.4756, longitude: 7.0234 },

    // ============================================
    // KWARA STATE
    // ============================================
    { state: 'Kwara', city: 'Ilorin', area: 'Ilorin', slug: 'kwara-ilorin', is_major_city: true, latitude: 8.4966, longitude: 4.5426 },
    { state: 'Kwara', city: 'Ilorin', area: 'GRA', slug: 'kwara-ilorin-gra', is_major_city: true, latitude: 8.4823, longitude: 4.5512 },

    // ============================================
    // OGUN STATE
    // ============================================
    { state: 'Ogun', city: 'Abeokuta', area: 'Abeokuta', slug: 'ogun-abeokuta', is_major_city: true, latitude: 7.1475, longitude: 3.3619 },
    { state: 'Ogun', city: 'Ota', area: 'Ota', slug: 'ogun-ota', is_major_city: true, latitude: 6.6917, longitude: 3.2333 },
    { state: 'Ogun', city: 'Sagamu', area: 'Sagamu', slug: 'ogun-sagamu', is_major_city: true, latitude: 6.8333, longitude: 3.6500 },

    // ============================================
    // OSUN STATE
    // ============================================
    { state: 'Osun', city: 'Osogbo', area: 'Osogbo', slug: 'osun-osogbo', is_major_city: true, latitude: 7.7667, longitude: 4.5667 },
    { state: 'Osun', city: 'Ile-Ife', area: 'Ile-Ife', slug: 'osun-ile-ife', is_major_city: true, latitude: 7.4667, longitude: 4.5667 },

    // ============================================
    // ONDO STATE
    // ============================================
    { state: 'Ondo', city: 'Akure', area: 'Akure', slug: 'ondo-akure', is_major_city: true, latitude: 7.2500, longitude: 5.1950 },
    { state: 'Ondo', city: 'Ondo', area: 'Ondo Town', slug: 'ondo-ondo-town', is_major_city: true, latitude: 7.1000, longitude: 4.8333 },

    // ============================================
    // EKITI STATE
    // ============================================
    { state: 'Ekiti', city: 'Ado-Ekiti', area: 'Ado-Ekiti', slug: 'ekiti-ado-ekiti', is_major_city: true, latitude: 7.6167, longitude: 5.2167 },

    // ============================================
    // CROSS RIVER STATE
    // ============================================
    { state: 'Cross River', city: 'Calabar', area: 'Calabar', slug: 'cross-river-calabar', is_major_city: true, latitude: 4.9517, longitude: 8.3220 },

    // ============================================
    // AKWA IBOM STATE
    // ============================================
    { state: 'Akwa Ibom', city: 'Uyo', area: 'Uyo', slug: 'akwa-ibom-uyo', is_major_city: true, latitude: 5.0377, longitude: 7.9128 },

    // ============================================
    // BENUE STATE
    // ============================================
    { state: 'Benue', city: 'Makurdi', area: 'Makurdi', slug: 'benue-makurdi', is_major_city: true, latitude: 7.7333, longitude: 8.5167 },

    // ============================================
    // PLATEAU STATE
    // ============================================
    { state: 'Plateau', city: 'Jos', area: 'Jos', slug: 'plateau-jos', is_major_city: true, latitude: 9.8965, longitude: 8.8583 },

    // ============================================
    // BAUCHI STATE
    // ============================================
    { state: 'Bauchi', city: 'Bauchi', area: 'Bauchi', slug: 'bauchi-bauchi', is_major_city: true, latitude: 10.3158, longitude: 9.8442 },

    // ============================================
    // BORNO STATE
    // ============================================
    { state: 'Borno', city: 'Maiduguri', area: 'Maiduguri', slug: 'borno-maiduguri', is_major_city: true, latitude: 11.8333, longitude: 13.1500 },

    // ============================================
    // ADAMAWA STATE
    // ============================================
    { state: 'Adamawa', city: 'Yola', area: 'Yola', slug: 'adamawa-yola', is_major_city: true, latitude: 9.2333, longitude: 12.4667 },

    // ============================================
    // NIGER STATE
    // ============================================
    { state: 'Niger', city: 'Minna', area: 'Minna', slug: 'niger-minna', is_major_city: true, latitude: 9.6139, longitude: 6.5569 },

    // ============================================
    // SOKOTO STATE
    // ============================================
    { state: 'Sokoto', city: 'Sokoto', area: 'Sokoto', slug: 'sokoto-sokoto', is_major_city: true, latitude: 13.0622, longitude: 5.2339 },

    // ============================================
    // KATSINA STATE
    // ============================================
    { state: 'Katsina', city: 'Katsina', area: 'Katsina', slug: 'katsina-katsina', is_major_city: true, latitude: 13.0000, longitude: 7.6000 },

    // ============================================
    // KEBBI STATE
    // ============================================
    { state: 'Kebbi', city: 'Birnin Kebbi', area: 'Birnin Kebbi', slug: 'kebbi-birnin-kebbi', is_major_city: true, latitude: 12.4539, longitude: 4.1975 },

    // ============================================
    // ZAMFARA STATE
    // ============================================
    { state: 'Zamfara', city: 'Gusau', area: 'Gusau', slug: 'zamfara-gusau', is_major_city: true, latitude: 12.1704, longitude: 6.6611 },

    // ============================================
    // JIGAWA STATE
    // ============================================
    { state: 'Jigawa', city: 'Dutse', area: 'Dutse', slug: 'jigawa-dutse', is_major_city: true, latitude: 11.7000, longitude: 9.3333 },

    // ============================================
    // YOBE STATE
    // ============================================
    { state: 'Yobe', city: 'Damaturu', area: 'Damaturu', slug: 'yobe-damaturu', is_major_city: true, latitude: 11.7469, longitude: 11.9608 },

    // ============================================
    // GOMBE STATE
    // ============================================
    { state: 'Gombe', city: 'Gombe', area: 'Gombe', slug: 'gombe-gombe', is_major_city: true, latitude: 10.2833, longitude: 11.1667 },

    // ============================================
    // TARABA STATE
    // ============================================
    { state: 'Taraba', city: 'Jalingo', area: 'Jalingo', slug: 'taraba-jalingo', is_major_city: true, latitude: 8.9000, longitude: 11.3667 },

    // ============================================
    // NASARAWA STATE
    // ============================================
    { state: 'Nasarawa', city: 'Lafia', area: 'Lafia', slug: 'nasarawa-lafia', is_major_city: true, latitude: 8.4904, longitude: 8.5155 },

    // ============================================
    // KOGI STATE
    // ============================================
    { state: 'Kogi', city: 'Lokoja', area: 'Lokoja', slug: 'kogi-lokoja', is_major_city: true, latitude: 7.7969, longitude: 6.7408 },

    // ============================================
    // EBONYI STATE
    // ============================================
    { state: 'Ebonyi', city: 'Abakaliki', area: 'Abakaliki', slug: 'ebonyi-abakaliki', is_major_city: true, latitude: 6.3167, longitude: 8.1167 },

    // ============================================
    // BAYELSA STATE
    // ============================================
    { state: 'Bayelsa', city: 'Yenagoa', area: 'Yenagoa', slug: 'bayelsa-yenagoa', is_major_city: true, latitude: 4.9267, longitude: 6.2676 }
];

module.exports = nigerianLocations;
