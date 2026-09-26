#!/usr/bin/env python3
"""Resolve lat/lon for one representative city per Nepal district via Open-Meteo geocoding."""
import json, time, urllib.parse, urllib.request

PLACES = [
    # (name_en, name_ne, province, district, query)
    ("Bhojpur", "भोजपुर", "koshi", "Bhojpur", "Bhojpur"),
    ("Dhankuta", "धनकुटा", "koshi", "Dhankuta", "Dhankuta"),
    ("Ilam", "इलाम", "koshi", "Ilam", "Ilam"),
    ("Bhadrapur", "भद्रपुर", "koshi", "Jhapa", "Bhadrapur"),
    ("Diktel", "दिक्तेल", "koshi", "Khotang", "Diktel"),
    ("Biratnagar", "विराटनगर", "koshi", "Morang", "Biratnagar"),
    ("Okhaldhunga", "ओखलढुङ्गा", "koshi", "Okhaldhunga", "Okhaldhunga"),
    ("Phidim", "फिदिम", "koshi", "Panchthar", "Phidim"),
    ("Khandbari", "खाँदबारी", "koshi", "Sankhuwasabha", "Khandbari"),
    ("Lukla", "लुक्ला", "koshi", "Solukhumbu", "Lukla"),
    ("Inaruwa", "इनरुवा", "koshi", "Sunsari", "Inaruwa"),
    ("Taplejung", "ताप्लेजुङ", "koshi", "Taplejung", "Taplejung"),
    ("Myanglung", "म्याङलुङ", "koshi", "Terhathum", "Myanglung"),
    ("Gaighat", "गाईघाट", "koshi", "Udayapur", "Gaighat"),
    ("Kalaiya", "कलैया", "madhesh", "Bara", "Kalaiya"),
    ("Janakpur", "जनकपुर", "madhesh", "Dhanusha", "Janakpur"),
    ("Jaleshwor", "जलेश्वर", "madhesh", "Mahottari", "Jaleshwor"),
    ("Birgunj", "वीरगञ्ज", "madhesh", "Parsa", "Birgunj"),
    ("Gaur", "गौर", "madhesh", "Rautahat", "Gaur"),
    ("Rajbiraj", "राजविराज", "madhesh", "Saptari", "Rajbiraj"),
    ("Malangwa", "मलंगवा", "madhesh", "Sarlahi", "Malangwa"),
    ("Siraha", "सिराहा", "madhesh", "Siraha", "Siraha"),
    ("Bhaktapur", "भक्तपुर", "bagmati", "Bhaktapur", "Bhaktapur"),
    ("Bharatpur", "भरतपुर", "bagmati", "Chitwan", "Bharatpur"),
    ("Dhading Besi", "धादिङ बेसी", "bagmati", "Dhading", "Dhading Besi"),
    ("Charikot", "चरिकोट", "bagmati", "Dolakha", "Charikot"),
    ("Kathmandu", "काठमाडौं", "bagmati", "Kathmandu", "Kathmandu"),
    ("Dhulikhel", "धुलिखेल", "bagmati", "Kavrepalanchok", "Dhulikhel"),
    ("Lalitpur", "ललितपुर", "bagmati", "Lalitpur", "Lalitpur"),
    ("Hetauda", "हेटौडा", "bagmati", "Makwanpur", "Hetauda"),
    ("Bidur", "बिदुर", "bagmati", "Nuwakot", "Bidur"),
    ("Dhunche", "धुन्चे", "bagmati", "Rasuwa", "Dhunche"),
    ("Manthali", "मन्थली", "bagmati", "Ramechhap", "Manthali"),
    ("Kamalamai", "कमलामाई", "bagmati", "Sindhuli", "Kamalamai"),
    ("Chautara", "चौतारा", "bagmati", "Sindhupalchok", "Chautara"),
    ("Baglung", "बागलुङ", "gandaki", "Baglung", "Baglung"),
    ("Gorkha", "गोरखा", "gandaki", "Gorkha", "Gorkha"),
    ("Pokhara", "पोखरा", "gandaki", "Kaski", "Pokhara"),
    ("Besisahar", "बेंसीशहर", "gandaki", "Lamjung", "Besisahar"),
    ("Chame", "चामे", "gandaki", "Manang", "Chame"),
    ("Jomsom", "जोमसोम", "gandaki", "Mustang", "Jomsom"),
    ("Beni", "बेनी", "gandaki", "Myagdi", "Beni"),
    ("Kawasoti", "कावासोती", "gandaki", "Nawalpur", "Kawasoti"),
    ("Kusma", "कुश्मा", "gandaki", "Parbat", "Kusma"),
    ("Putalibazar", "पुतलीबजार", "gandaki", "Syangja", "Putalibazar"),
    ("Damauli", "दमौली", "gandaki", "Tanahun", "Damauli"),
    ("Sandhikharka", "सन्धिखर्क", "lumbini", "Arghakhanchi", "Sandhikharka"),
    ("Nepalgunj", "नेपालगञ्ज", "lumbini", "Banke", "Nepalgunj"),
    ("Gulariya", "गुलरिया", "lumbini", "Bardiya", "Gulariya"),
    ("Ghorahi", "घोराही", "lumbini", "Dang", "Ghorahi"),
    ("Tamghas", "तम्घास", "lumbini", "Gulmi", "Tamghas"),
    ("Taulihawa", "तौलिहवा", "lumbini", "Kapilvastu", "Taulihawa"),
    ("Tansen", "तानसेन", "lumbini", "Palpa", "Tansen"),
    ("Ramgram", "रामग्राम", "lumbini", "Parasi", "Ramgram"),
    ("Pyuthan", "प्यूठान", "lumbini", "Pyuthan", "Pyuthan"),
    ("Liwang", "लिवाङ", "lumbini", "Rolpa", "Liwang"),
    ("Rukumkot", "रुकुमकोट", "lumbini", "Rukum East", "Rukumkot"),
    ("Butwal", "बुटवल", "lumbini", "Rupandehi", "Butwal"),
    ("Dailekh", "दैलेख", "karnali", "Dailekh", "Dailekh"),
    ("Dunai", "दुनै", "karnali", "Dolpa", "Dunai"),
    ("Simikot", "सिमिकोट", "karnali", "Humla", "Simikot"),
    ("Khalanga", "खलङ्गा", "karnali", "Jajarkot", "Khalanga Jajarkot"),
    ("Jumla", "जुम्ला", "karnali", "Jumla", "Jumla"),
    ("Manma", "मान्मा", "karnali", "Kalikot", "Manma"),
    ("Gamgadhi", "गमगढी", "karnali", "Mugu", "Gamgadhi"),
    ("Musikot", "मुसिकोट", "karnali", "Rukum West", "Musikot"),
    ("Salyan", "सल्यान", "karnali", "Salyan", "Salyan Khalanga"),
    ("Birendranagar", "वीरेन्द्रनगर", "karnali", "Surkhet", "Birendranagar"),
    ("Mangalsen", "मङ्गलसेन", "sudurpashchim", "Achham", "Mangalsen"),
    ("Dasharathchand", "दशरथचन्द", "sudurpashchim", "Baitadi", "Dasharathchand"),
    ("Chainpur", "चैनपुर", "sudurpashchim", "Bajhang", "Chainpur Bajhang"),
    ("Martadi", "मार्तडी", "sudurpashchim", "Bajura", "Martadi"),
    ("Dadeldhura", "डडेल्धुरा", "sudurpashchim", "Dadeldhura", "Dadeldhura"),
    ("Darchula Khalanga", "खलङ्गा", "sudurpashchim", "Darchula", "Khalanga Darchula"),
    ("Dipayal", "दिपायल", "sudurpashchim", "Doti", "Dipayal"),
    ("Dhangadhi", "धनगढी", "sudurpashchim", "Kailali", "Dhangadhi"),
    ("Mahendranagar", "महेन्द्रनगर", "sudurpashchim", "Kanchanpur", "Mahendranagar"),
]

def geocode(q):
    url = ("https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
        {"name": q, "count": 5, "language": "en", "format": "json"}))
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.load(r).get("results") or []

out, problems = [], []
for name, ne, prov, district, q in PLACES:
    try:
        res = geocode(q)
    except Exception as e:
        problems.append((name, "fetch error: %s" % e)); continue
    pick = None
    for r in res:
        if r.get("country_code") == "NP":
            pick = r; break
    if not pick and res:
        pick = res[0]
    if not pick:
        problems.append((name, "no results for %r" % q)); continue
    lat, lon = round(pick["latitude"], 4), round(pick["longitude"], 4)
    ok = 26.0 <= lat <= 30.8 and 79.8 <= lon <= 88.5
    if not ok:
        problems.append((name, "out of Nepal bbox: %s %s (%s)" % (lat, lon, pick.get("name"))))
        continue
    out.append({"name": name, "ne": ne, "province": prov, "district": district,
                "lat": lat, "lon": lon, "geo_name": pick.get("name")})
    time.sleep(0.15)

print("resolved: %d / %d" % (len(out), len(PLACES)))
for n, p in problems:
    print("PROBLEM:", n, "-", p)
json.dump(out, open("districts_resolved.json", "w"), ensure_ascii=False, indent=1)
