/* Mausam Nepal: advisory engine.
   Reads forecast data and emits farmer / traveler advisories in EN + NE,
   in the style of DHM/NARC agromet bulletins. */
window.MN = window.MN || {};

MN.Advisories = (function () {

  function B(en, ne) { return { en, ne }; }

  function monthOf(data) { return parseInt(data.current.time.slice(5, 7), 10); }

  function nextHours(data, n, name) {
    const i = MN.WX.currentHourIndex(data);
    const out = [];
    for (let k = 0; k < n; k++) out.push(MN.WX.at(data, i + k, name));
    return out;
  }
  function sumNext(data, n, name) {
    return nextHours(data, n, name).reduce((a, v) => a + (isNaN(v) ? 0 : v), 0);
  }
  function maxNext(data, n, name) {
    const vs = nextHours(data, n, name).filter(v => !isNaN(v));
    return vs.length ? Math.max.apply(null, vs) : NaN;
  }
  function minNext(data, n, name) {
    const vs = nextHours(data, n, name).filter(v => !isNaN(v));
    return vs.length ? Math.min.apply(null, vs) : NaN;
  }
  function codesNext(data, n) { return nextHours(data, n, "weather_code"); }

  function mm(x) { return MN.num(Math.round(x)); }

  /* ---------------- FARMERS ---------------- */
  function farmerAdvisories(loc, data, drought) {
    const out = [];
    const rain24 = sumNext(data, 24, "precipitation");
    const codes = codesNext(data, 48);
    const hasHail = codes.some(c => c === 96 || c === 99);
    const hasStorm = codes.some(c => c === 95 || c === 96 || c === 99);
    const tMin48 = minNext(data, 48, "temperature_2m");
    const tMax48 = maxNext(data, 48, "temperature_2m");
    const gust48 = maxNext(data, 48, "wind_gusts_10m");
    const mo = monthOf(data);

    if (hasHail) out.push({ sev: "critical",
      title: B("Hailstorm risk in the next 48 hours", "आगामी ४८ घण्टामा असिनाको जोखिम"),
      body: B("Thunderstorms with hail are possible. Move harvested grain, vegetables and nursery seedlings under cover, and keep livestock sheltered.",
              "असिनासहितको चट्याङ पर्न सक्छ। काटिएको अन्न, तरकारी र नर्सरीका बिरुवा छानामुनि सार्नुहोस्, पशुधनलाई गोठमा राख्नुहोस्।") });
    if (rain24 >= 80) out.push({ sev: "critical",
      title: B("Very heavy rain: " + mm(rain24) + " mm expected in 24 hours", "अत्यधिक भारी वर्षा: २४ घण्टामा " + mm(rain24) + " मिमि"),
      body: B("Delay harvesting mature paddy. Open field drains to avoid waterlogging, and move harvested grain and seed to dry, ventilated shelter. Avoid working in flooded fields.",
              "पाकेको धान काट्न केही दिन रोक्नुहोस्। खेत डुबानबाट बच्न नाली खुला राख्नुहोस्, काटिएको अन्न र बीउ सुक्खा, हावा चल्ने ठाउँमा सार्नुहोस्। डुबेका खेतमा काम नगर्नुहोस्।") });
    else if (rain24 >= 40) out.push({ sev: "warning",
      title: B("Heavy rain: " + mm(rain24) + " mm in the next 24 hours", "भारी वर्षा: आगामी २४ घण्टामा " + mm(rain24) + " मिमि"),
      body: B("Ensure drainage in paddy fields. Postpone fertilizer or pesticide application until the rain passes, and protect harvested produce from getting wet.",
              "धान खेतमा निकासको व्यवस्था गर्नुहोस्। वर्षा नथामिँदासम्म मल वा विषादी नछर्नुहोस्, काटिएको उपज नभिज्ने गरी छोप्नुहोस्।") });
    else if (rain24 >= 15) out.push({ sev: "watch",
      title: B("Moderate rain ahead: " + mm(rain24) + " mm in 24 hours", "मध्यम वर्षा: २४ घण्टामा " + mm(rain24) + " मिमि"),
      body: B("Useful moisture for standing crops. Check bunds and drains so fields do not stay waterlogged after the rain.",
              "बालीका लागि उपयोगी आर्द्रता। वर्षापछि खेत नडुब्ने गरी आली र नाली जाँच गर्नुहोस्।") });
    if (hasStorm && !hasHail) out.push({ sev: "warning",
      title: B("Thunderstorms likely within 48 hours", "४८ घण्टाभित्र चट्याङ पर्ने सम्भावना"),
      body: B("Keep farm workers and livestock away from open fields and tall trees during storms. Secure loose sheets and sheds.",
              "चट्याङ पर्दा खेतबारी र अग्ला रुखबाट टाढा रहनुहोस्, पशुधनलाई सुरक्षित ठाउँमा राख्नुहोस्। छाना र टहरा कसिलो पार्नुहोस्।") });
    if (!isNaN(gust48) && gust48 >= 60) out.push({ sev: "warning",
      title: B("Strong wind gusts to " + mm(gust48) + " km/h", mm(gust48) + " किमी/घण्टासम्मको हुरी"),
      body: B("Do not spray pesticides during gusty hours. Stake young vegetable plants and check polyhouses and sheds.",
              "हुरी चलेको बेला विषादी नछर्नुहोस्। तरकारीका बिरुवालाई टेको दिनुहोस्, टनेल र गोठ जाँच गर्नुहोस्।") });
    if (!isNaN(tMin48) && tMin48 < 2 && loc.zone === "terai") out.push({ sev: "warning",
      title: B("Frost risk: night temperature near " + mm(tMin48) + "°C", "शितलहरको जोखिम: रातिको तापक्रम " + mm(tMin48) + "°C नजिक"),
      body: B("Cover nursery seedlings and young vegetable crops at night. Light evening irrigation helps protect wheat and mustard from frost damage.",
              "राति नर्सरीका बिरुवा र तरकारी छोप्नुहोस्। साँझपख हल्का सिँचाइ गर्दा गहुँ र तोरीलाई शितलहरबाट बचाउन मद्दत गर्छ।") });
    if (!isNaN(tMax48) && tMax48 > 38 && loc.zone === "terai") out.push({ sev: "watch",
      title: B("Heat stress: day temperature above " + mm(tMax48) + "°C", "तातो हावा: दिउँसोको तापक्रम " + mm(tMax48) + "°C माथि"),
      body: B("Give livestock shade and plenty of water. Irrigate in the early morning or evening, and mulch vegetable beds to hold soil moisture.",
              "पशुधनलाई छहारी र पर्याप्त पानी दिनुहोस्। बिहान सबेरै वा साँझपख सिँचाइ गर्नुहोस्, तरकारीका क्यारीमा मल्चिङ गर्नुहोस्।") });

    /* Drought / dry-spell logic from the drought module */
    if (drought && drought.pct !== null) {
      if (drought.pct < 35 && mo >= 6 && mo <= 9) out.push({ sev: "critical",
        title: B("Monsoon rainfall deficit: only " + mm(drought.pct) + "% of normal", "मनसुनी वर्षामा कमी: सामान्यको जम्मा " + mm(drought.pct) + "%"),
        body: B("Rainfed paddy is under serious water stress. If irrigation is available, prioritize nursery and transplanted fields. Consider short-duration paddy varieties after consulting your agriculture technician.",
                "आकाशे धानमा गम्भीर पानीको तनाव छ। सिँचाइ उपलब्ध भए नर्सरी र रोपिएका खेतलाई प्राथमिकता दिनुहोस्। कृषि प्राविधिकसँग सल्लाह गरी छोटो अवधिका धानका जातबारे सोच्नुहोस्।") });
      else if (drought.pct < 60 && mo >= 6 && mo <= 9) out.push({ sev: "warning",
        title: B("Below-normal monsoon rain: " + mm(drought.pct) + "% of normal", "सरदरभन्दा कम मनसुनी वर्षा: सामान्यको " + mm(drought.pct) + "%"),
        body: B("Rainfall is running below normal. Maintain field bunds to capture every shower, and delay transplanting if seedlings would face dry fields.",
                "वर्षा सामान्यभन्दा कम भइरहेको छ। हरेक झरी सङ्कलन गर्न आली मर्मत गर्नुहोस्, खेत सुक्खा हुने भए रोपाइँ केही दिन सार्नुहोस्।") });
      else if (drought.pct < 50 && (mo >= 11 || mo <= 2)) out.push({ sev: "watch",
        title: B("Dry winter: " + mm(drought.pct) + "% of normal rain", "सुक्खा हिउँद: सामान्यको " + mm(drought.pct) + "% वर्षा"),
        body: B("Wheat and barley need moisture at crown-root and flowering stages. Irrigate where possible, prioritizing fields at critical growth stages.",
                "गहुँ र जौलाई जरै र फूल फुल्ने अवस्थामा आर्द्रता चाहिन्छ। सम्भव भए सिँचाइ गर्नुहोस्, महत्वपूर्ण अवस्थाका खेतलाई प्राथमिकता दिनुहोस्।") });
    }

    /* Crop calendar note */
    out.push({ sev: "info", title: cropTitle(mo), body: cropBody(mo) });

    if (!out.some(a => a.sev === "critical" || a.sev === "warning"))
      out.unshift({ sev: "good",
        title: B("Favorable fieldwork window", "खेतबारीका लागि उपयुक्त समय"),
        body: B("No damaging weather is expected in the next 48 hours. A good window for sowing, weeding, spraying and harvesting.",
                "आगामी ४८ घण्टामा हानिकारक मौसमको सम्भावना छैन। रोप्ने, गोड्ने, विषादी छर्ने र बाली काट्ने राम्रो समय हो।") });
    return out;
  }

  function cropTitle(mo) {
    const m = {
      1: B("Crop note: wheat in tillering stage", "बाली नोट: गहुँ गाँज आउने अवस्थामा"),
      2: B("Crop note: wheat flowering", "बाली नोट: गहुँमा फूल फुल्ने बेला"),
      3: B("Crop note: wheat harvest begins", "बाली नोट: गहुँ काट्ने समय सुरु"),
      4: B("Crop note: prepare maize sowing", "बाली नोट: मकै छर्ने तयारी"),
      5: B("Crop note: pre-monsoon field prep", "बाली नोट: मनसुनअघिको खेत तयारी"),
      6: B("Crop note: paddy transplanting season", "बाली नोट: धान रोपाइँको मौसम"),
      7: B("Crop note: paddy transplanting continues", "बाली नोट: धान रोपाइँ जारी"),
      8: B("Crop note: paddy tillering", "बाली नोट: धानमा गाँज आउने बेला"),
      9: B("Crop note: paddy grain filling", "बाली नोट: धानमा दाना लाग्ने बेला"),
      10: B("Crop note: paddy harvest season", "बाली नोट: धान काट्ने मौसम"),
      11: B("Crop note: wheat sowing after paddy", "बाली नोट: धानपछि गहुँ छर्ने बेला"),
      12: B("Crop note: wheat germination", "बाली नोट: गहुँ उम्रने बेला"),
    };
    return m[mo] || B("Crop note", "बाली नोट");
  }
  function cropBody(mo) {
    const m = {
      1: B("Wheat is tillering. One irrigation now boosts grain number; watch for yellow rust in foggy spells.", "गहुँ गाँज आइरहेको छ। अहिले एकपटक सिँचाइ गर्दा दाना बढ्छ; कुहिरो लाग्दा पहेँलो सिन्दुरे रोग हेर्नुहोस्।"),
      2: B("Wheat is flowering, the most sensitive stage. Avoid water stress and do not spray in windy hours.", "गहुँमा फूल फुल्दैछ, सबैभन्दा संवेदनशील अवस्था। पानीको तनाव हुन नदिनुहोस्, हुरीमा विषादी नछर्नुहोस्।"),
      3: B("Wheat harvest begins in the Terai. Cut on dry days and dry grain to safe moisture before storage.", "तराईमा गहुँ काट्ने समय। सुक्खा दिनमा काट्नुहोस्, भण्डारणअघि दानालाई राम्ररी सुकाउनुहोस्।"),
      4: B("Sow spring maize with the first good pre-monsoon showers. Prepare compost and repair terraces.", "पहिलो राम्रो प्रि-मनसुनी झरीसँगै वसन्ते मकै छर्नुहोस्। कम्पोस्ट तयार गर्नुहोस्, कान्ला मर्मत गर्नुहोस्।"),
      5: B("Prepare paddy nurseries and level fields before the monsoon. Thunderstorms and hail are common now.", "मनसुनअघि धानको नर्सरी र खेत सम्याउने काम गर्नुहोस्। अहिले चट्याङ र असिना सामान्य हो।"),
      6: B("Transplant paddy as the monsoon sets in. Keep seedlings 21-25 days old and maintain 2-3 cm standing water.", "मनसुन सुरु भएसँगै धान रोप्नुहोस्। बेर्ना २१-२५ दिनको राख्नुहोस्, २-३ सेमी पानी कायम गर्नुहोस्।"),
      7: B("Complete transplanting early in the month. Weed once and top-dress urea before the heavy monsoon rains.", "महिनाको सुरुमै रोपाइँ सक्नुहोस्। एकपटक गोड्नुहोस् र भारी वर्षाअघि युरिया टप-ड्रेस गर्नुहोस्।"),
      8: B("Paddy is tillering. Drain excess water after very heavy rain so roots get air; watch for stem borer.", "धानमा गाँज आइरहेको छ। अत्यधिक वर्षापछि बढी पानी निकास गर्नुहोस्; गवारो कीरा हेर्नुहोस्।"),
      9: B("Grain filling stage. Do not let fields dry out now; plan harvest labor as October approaches.", "दानामा दूध लाग्ने बेला। खेत सुक्न नदिनुहोस्; असोज नजिकिँदै कटानीका लागि जनशक्ति योजना बनाउनुहोस्।"),
      10: B("Harvest paddy on consecutive dry days. Dry grain in the sun to 12-14% moisture before bagging.", "लगातार सुक्खा दिनमा धान काट्नुहोस्। बोरामा हाल्नुअघि दानालाई घाममा १२-१४% आर्द्रतासम्म सुकाउनुहोस्।"),
      11: B("Sow wheat within two weeks of paddy harvest for best yields. Use certified seed and balanced fertilizer.", "धान काटेको दुई हप्ताभित्र गहुँ छर्दा राम्रो उत्पादन हुन्छ। प्रमाणित बीउ र सन्तुलित मल प्रयोग गर्नुहोस्।"),
      12: B("Wheat germination. Light irrigation helps emergence if the winter is dry; protect nurseries from frost.", "गहुँ उम्रँदैछ। हिउँद सुक्खा भए हल्का सिँचाइले उम्रन मद्दत गर्छ; नर्सरीलाई शितलहरबाट बचाउनुहोस्।"),
    };
    return m[mo] || B("Follow local extension advice for the season.", "मौसमअनुसार स्थानीय कृषि प्राविधिकको सल्लाह लिनुहोस्।");
  }

  /* ---------------- TRAVELERS ---------------- */
  function travelerAdvisories(loc, data) {
    const out = [];
    const rain24 = sumNext(data, 24, "precipitation");
    const codes = codesNext(data, 48);
    const hasStorm = codes.some(c => c >= 95);
    const vis24 = minNext(data, 24, "visibility");
    const gust48 = maxNext(data, 48, "wind_gusts_10m");
    const mtn = loc.zone === "mountain";

    if (mtn) {
      const w500 = maxNext(data, 48, "wind_speed_500hPa");
      const w700 = maxNext(data, 48, "wind_speed_700hPa");
      const waloft = Math.max(isNaN(w500) ? 0 : w500, isNaN(w700) ? 0 : w700);
      const fl = maxNext(data, 24, "freezing_level_height");
      if (waloft >= 70) out.push({ sev: "critical",
        title: B("Dangerous winds aloft: " + mm(waloft) + " km/h", "माथिल्लो तहमा खतरनाक हावा: " + mm(waloft) + " किमी/घण्टा"),
        body: B("Jet-stream level winds over the high mountains. Avoid high passes and exposed ridgelines; postpone summit attempts.",
                "हिमालमाथि जेट-स्ट्रिम तहको हावा। अग्ला भञ्ज्याङ र खुला डाँडामा नजानुहोस्; शिखर प्रयास स्थगित गर्नुहोस्।") });
      else if (waloft >= 50) out.push({ sev: "warning",
        title: B("Strong winds aloft: " + mm(waloft) + " km/h", "माथिल्लो तहमा तेज हावा: " + mm(waloft) + " किमी/घण्टा"),
        body: B("Expect very windy conditions above 4,000 m. Secure tents well and plan shorter days on exposed sections.",
                "४,००० मिटरमाथि धेरै हावा चल्ने अनुमान। टेन्ट राम्ररी गाड्नुहोस्, खुला भागमा छोटो यात्रा योजना बनाउनुहोस्।") });
      if (!isNaN(fl) && fl < loc.elev) out.push({ sev: "critical",
        title: B("Snow at your elevation", "तपाईंको उचाइमा हिमपात"),
        body: B("The freezing level is below your elevation, so precipitation will fall as snow. Carry winter gear and allow extra time.",
                "हिउँ पर्ने उचाइ तपाईं रहेको उचाइभन्दा तल छ, त्यसैले हिमपात हुनेछ। न्यानो लुगा बोक्नुहोस्, अतिरिक्त समय छुट्याउनुहोस्।") });
      else if (!isNaN(fl) && fl < loc.elev + 600) out.push({ sev: "warning",
        title: B("Snow likely just above you", "तपाईंभन्दा माथि हिमपातको सम्भावना"),
        body: B("The freezing level is near your elevation. Trails above you may be snow-covered and slippery.",
                "हिउँ पर्ने उचाइ तपाईंको उचाइ नजिक छ। माथिका बाटामा हिउँ जमेर चिप्लो हुन सक्छ।") });
    }

    if (rain24 >= 100 && loc.zone !== "terai") out.push({ sev: "critical",
      title: B("Extreme rain: landslide danger (" + mm(rain24) + " mm/24h)", "अत्यधिक वर्षा: पहिरोको खतरा (" + mm(rain24) + " मिमि/२४घण्टा)"),
      body: B("Very high risk of landslides and road blocks on hill highways. Postpone travel; if on the road, avoid stopping below steep slopes and never drive at night.",
              "पहाडी राजमार्गमा पहिरो र बाटो अवरुद्ध हुने उच्च जोखिम। यात्रा स्थगित गर्नुहोस्; बाटामा भए भिरालो पाखामुनि नरोकिनुहोस्, राति सवारी नचलाउनुहोस्।") });
    else if (rain24 >= 50 && loc.zone !== "terai") out.push({ sev: "warning",
      title: B("Heavy rain: landslide risk on hill roads", "भारी वर्षा: पहाडी बाटामा पहिरोको जोखिम"),
      body: B("Rain of " + mm(rain24) + " mm in 24 hours can trigger landslides. Check road status before leaving, keep buffer time, and avoid night driving in the hills.",
              "२४ घण्टामा " + mm(rain24) + " मिमि वर्षाले पहिरो जान सक्छ। हिँड्नुअघि बाटोको अवस्था बुझ्नुहोस्, समय बढी छुट्याउनुहोस्, पहाडमा राति यात्रा नगर्नुहोस्।") });
    else if (rain24 >= 50) out.push({ sev: "warning",
      title: B("Heavy rain: " + mm(rain24) + " mm in 24 hours", "भारी वर्षा: २४ घण्टामा " + mm(rain24) + " मिमि"),
      body: B("Expect waterlogging on Terai roads and possible flight delays. Keep rain gear and allow extra travel time.",
              "तराईका बाटामा पानी जम्न सक्छ, उडान ढिलो हुन सक्छ। वर्षादी बोक्नुहोस्, अतिरिक्त समय छुट्याउनुहोस्।") });

    if (loc.slug === "lukla") {
      const cloud24 = maxNext(data, 24, "cloud_cover");
      if ((!isNaN(vis24) && vis24 < 2000) || (!isNaN(cloud24) && cloud24 > 85)) out.push({ sev: "warning",
        title: B("Lukla flights likely disrupted", "लुक्ला उडान प्रभावित हुने सम्भावना"),
        body: B("Low cloud and poor visibility are expected. Flights to Lukla are often delayed or cancelled in such weather; keep your schedule flexible and confirm with your airline.",
                "बाक्लो बादल र कम दृश्यताको अनुमान छ। यस्तो मौसममा लुक्ला उडान ढिलो वा रद्द हुन्छन्; तालिका लचिलो राख्नुहोस्, एयरलाइन्ससँग सम्पर्क गर्नुहोस्।") });
    }
    if (!isNaN(vis24) && vis24 < 1000 && loc.slug !== "lukla") out.push({ sev: "watch",
      title: B("Poor visibility: " + mm(vis24) + " m", "कमजोर दृश्यता: " + mm(vis24) + " मिटर"),
      body: B("Fog or low cloud will cut visibility. Drive slowly with headlights on and keep distance from the vehicle ahead.",
              "कुहिरोले दृश्यता घटाउनेछ। बत्ती बालेर बिस्तारै चलाउनुहोस्, अगाडिको सवारीसँग दूरी कायम गर्नुहोस्।") });
    if (hasStorm) out.push({ sev: "warning",
      title: B("Thunderstorms expected", "चट्याङ पर्ने सम्भावना"),
      body: B("Avoid exposed ridgelines and high passes during storms. If caught outside, move away from lone trees and metal structures.",
              "चट्याङ पर्दा खुला डाँडा र भञ्ज्याङ नजानुहोस्। बाहिर परे एक्ला रुख र धातुका संरचनाबाट टाढा रहनुहोस्।") });
    if (!isNaN(gust48) && gust48 >= 70 && !mtn) out.push({ sev: "watch",
      title: B("Very gusty: " + mm(gust48) + " km/h", "तेज हुरी: " + mm(gust48) + " किमी/घण्टा"),
      body: B("Strong gusts can affect high-profile vehicles and make two-wheelers unstable. Grip firmly and reduce speed.",
              "तेज हुरीले ठूला सवारी र दुईपाङ्ग्रेलाई असर गर्न सक्छ। बलियोसँग समात्नुहोस्, गति घटाउनुहोस्।") });

    const rain48 = sumNext(data, 48, "precipitation");
    if (!out.some(a => a.sev === "critical" || a.sev === "warning") && rain48 < 2)
      out.unshift({ sev: "good",
        title: B("Excellent travel window", "यात्राका लागि उत्कृष्ट समय"),
        body: B("Dry and settled weather for the next 48 hours. Good conditions for road journeys and trekking.",
                "आगामी ४८ घण्टा सुक्खा र स्थिर मौसम। सडक यात्रा र पदयात्राका लागि उपयुक्त अवस्था।") });
    if (!out.length) out.push({ sev: "info",
      title: B("Normal travel conditions", "सामान्य यात्रा अवस्था"),
      body: B("No major weather hazards expected. Standard mountain and monsoon-season precautions still apply.",
              "कुनै ठूलो मौसमी खतरा छैन। हिमाल र मनसुनका सामान्य सावधानी भने अपनाउनुहोस्।") });
    return out;
  }

  return { farmerAdvisories, travelerAdvisories, cropTitle, cropBody };
})();
