// ---------- Study scripts: questions, answer pools, theme rules, recommendations ----------
// Seed studies are generated from these. Every count shown in the app is computed from the
// resulting Session / Answer / TranscriptTurn rows, never typed in.
const SCRIPTS = {
officewear: {
  signalMap: {
    collar:["Collar structure critical","critical"], drop_shoulder:["Drop shoulder","positive"],
    slim_discomfort:["Slim fit discomfort","negative"], crease:["Creasing on commute","negative"],
    sweat:["Sweat patches","negative"], commute:["Auto / metro commute","neutral"],
    price_ok:["WTP ≥ ₹1,799","positive"], earthy:["Earthy neutrals","positive"],
    breathable:["Fabric breathability (+)","positive"], skeptic_trend:["Trend skeptic","negative"]
  },
  pools: {
    1: [
      {t:"Most Fridays I dress down, and my last casual shirt was from Snitch. Before that, Uniqlo.",tags:[],s:0},
      {t:"Our office is business casual all week now, so maybe three days. Last one was a Bombay Shirt Company linen. Pricey but nice.",tags:[],s:1},
      {t:"Fridays and client-free days. Last casual shirt was Zara, I go there when I don't want to think.",tags:[],s:0},
      {t:"Almost every day since we went hybrid. Last shirt was from an Instagram D2C brand and the quality was hit or miss.",tags:["skeptic_trend"],s:-1},
      {t:"Two to three days a week. I bought an H&M overshirt last month but it creased like crazy.",tags:["crease"],s:-1},
      {t:"No dress code, but I keep it smart for client calls. Last casual shirt was Rare Rabbit.",tags:[],s:0}
    ],
    2: [
      {t:"I love streetwear on weekends, but I can't walk into a sprint review looking like a hip-hop video. Give me drop shoulders with a formal stiff collar.",tags:["collar","drop_shoulder"],s:1},
      {t:"Honestly, regular slim fits feel suffocating in Bengaluru metro heat. But completely baggy streetwear tees look unprofessional in front of leadership. I've been looking for relaxed, boxy shirts that still have a crisp, tailored collar.",tags:["collar","drop_shoulder","slim_discomfort"],s:1},
      {t:"Relaxed linen, 100%. Baggy tees on a Zoom call make me look like an intern.",tags:["drop_shoulder","breathable"],s:1},
      {t:"If it's oversized, the collar has to hold. A floppy collar is what makes it look lazy.",tags:["collar"],s:0},
      {t:"Drop-shoulder is fine, but not the huge streetwear cut. Something boxy but clean.",tags:["drop_shoulder"],s:1},
      {t:"Slim fit shirts stick to my back by 10 am. I'd switch to a relaxed cut if it still looked sharp.",tags:["slim_discomfort","sweat"],s:0},
      {t:"I'd still pick a regular fit. Oversized feels like a trend that will pass in a year.",tags:["skeptic_trend"],s:-1}
    ],
    3: [
      {v:1899,t:"At ₹1,800 I will order two colours without overthinking. At ₹2,400 I will wait for an End of Season Sale or simply walk into Uniqlo.",tags:["price_ok"],s:1},
      {v:1999,t:"Up to around two thousand is fine if the fabric is genuinely breathable. Beyond that I'm comparing with Zara.",tags:["price_ok","breathable"],s:0},
      {v:1799,t:"Snitch is ₹1,299 for most shirts. For a new brand I'd go to ₹1,799, max.",tags:["price_ok"],s:0},
      {v:2199,t:"If it lasts a full season without the collar curling, ₹2,199 is fair. BSC charges more anyway.",tags:["price_ok","collar"],s:1},
      {v:1599,t:"I'd want it under ₹1,600 for a first try. Once I trust the brand, maybe more.",tags:[],s:-1},
      {v:1899,t:"Ready to buy at ₹1,899 if the linen blend doesn't show underarm stains in Mumbai humidity.",tags:["price_ok","sweat"],s:1},
      {v:1699,t:"₹1,699 feels right. Above that, the Zara sale is always around the corner.",tags:[],s:0}
    ],
    4: [
      {t:"If a shirt gets crushed within 10 minutes of riding in an auto, it gets banished from my work wardrobe.",tags:["crease","commute"],s:-1},
      {t:"Sweat patches on the back after a 40-minute metro ride. I reach office looking like I ran there.",tags:["sweat","commute"],s:-1},
      {t:"Wrinkles. Linen looks great at 9 am and like a paper bag by 11.",tags:["crease"],s:-1},
      {t:"Fabric snagging on my bag strap. My backpack destroys anything delicate.",tags:["commute"],s:-1},
      {t:"The collar going limp in the humidity. The whole look depends on that collar.",tags:["collar"],s:-1},
      {t:"Nothing major, honestly. I drive, so the commute isn't an issue for me.",tags:[],s:0}
    ],
    5: [
      {v:["Mineral Sage","Slate Gray"],t:"Mineral Sage and Slate Gray. Things I can repeat without anyone noticing.",tags:["earthy"],s:1},
      {v:["Deep Navy","Off-White Raw"],t:"Navy and off-white. Basics that work with everything.",tags:["earthy"],s:0},
      {v:["Slate Gray","Deep Navy"],t:"Gray and navy, nothing loud for the office.",tags:["earthy"],s:0},
      {v:["Mineral Sage","Off-White Raw","Slate Gray"],t:"Sage, off-white, gray. Calm colours look more expensive.",tags:["earthy"],s:1},
      {v:["Bold prints"],t:"I like a bit of print, honestly. Plain gets boring.",tags:[],s:0},
      {v:["Off-White Raw"],t:"Off-white only. It breathes and looks clean.",tags:["earthy","breathable"],s:1}
    ]
  },
  themes: [
    {tags:["collar","drop_shoulder"],category:"unmet_need",name:"Silhouette Tension",
     headline:"The smart-casual paradox: baggy streetwear vs suffocating slim fit",
     body:"Tech and consulting professionals feel oversized tees look juvenile on camera and in client meetings, while slim-fit shirts are uncomfortable on Indian summer commutes. They want a crisp, tailored collar on a relaxed torso.",
     metric:"Want a relaxed fit with a structured collar"},
    {tags:["price_ok"],category:"buying_driver",name:"Price Elasticity",
     headline:"₹1,799–₹1,999 unlocks an impulse purchase; above ₹2,200 triggers a Zara comparison",
     body:"Participants see homegrown D2C linen-cotton as good value up to about ₹1,999. Above ₹2,200 they default to global fast fashion unless durability is clearly proven.",
     metric:"Would pay ₹1,799 or more"},
    {tags:["crease","sweat"],category:"friction",name:"Commute Reality",
     headline:"Breathability and commute creasing outweigh the brand story",
     body:"Daily commutes by auto, metro or non-AC bus are the real test. Shirts that crease or show sweat after a 40-minute ride are retired from the work wardrobe, whatever they look like.",
     metric:"Cite creasing or sweat on the commute"},
    {tags:["earthy"],category:"preference",name:"Colour Palette",
     headline:"Earthy neutrals dominate: Mineral Sage, Slate Gray, Off-White",
     body:"Bright accents and heavy prints were mostly rejected. Calm, earthy tones can be repeated across the week without looking repetitive.",
     metric:"Pick earthy neutrals"}
  ],
  headline:"Strong demand for “structured relaxed” office shirts; humid commutes drive willingness to pay ₹1,799–₹1,999 for breathable, crease-resistant fabric.",
  summary:"Participants are tired of rigid formalwear but worry about looking sloppy on client calls and in co-working offices. A relaxed drop-shoulder shirt with a structured collar band answers both concerns.",
  priceQ:3,
  recs: [
    {workstream:"product",theme:0,title:"Develop a hybrid-collar shirt in pre-washed 220 GSM linen-cotton",impact:"high",effort:"medium",track:"Next sprint",owner_team:"Textile Engineering & Sourcing",
     body_md:"- **Fused interlining collar:** heat-pressed interlining in the collar stand and cuffs keeps the collar upright through a 10-hour day while the body stays breathable.\n- **Relaxed airflow silhouette:** drop-shoulder torso with 2 inches of extra chest clearance to reduce back sweat on humid commutes.\n- **Industrial pre-wash:** a 3-cycle bio-enzyme pre-wash at the mill to stop post-purchase collar shrinkage and curl.",
     projected:[{label:"Spec file",value:null,unit:null,description:"PRD-LINEN-04 (draft)"}]},
    {workstream:"pricing",theme:1,title:"Anchor intro pricing at ₹1,899 with a 2-pack at ₹3,499",impact:"high",effort:"low",track:"Launch pricing",owner_team:"Growth & Merchandising",
     body_md:"- **Under-₹2k threshold:** single unit at ₹1,899 sits under the ₹2,000 risk barrier participants named for an unproven brand.\n- **AOV accelerator:** a curated 2-pack (Slate Gray + Off-White) at ₹3,499 saves ₹299 and lifts order value.",
     willingnessAt:1899,
     projected:[{label:"Expected gross margin on 2-pack",value:61.4,unit:"pct",description:"Finance projection from current COGS, not measured in interviews"}]},
    {workstream:"gtm",theme:2,title:"Creative hook: “The casual Friday shirt that survives your auto commute”",impact:"medium",effort:"low",track:"Paid social & Reels",owner_team:"Growth Marketing",
     body_md:"- **15s Reel:** a sped-up wrinkle test after a 35°C commute, split-screen auto vs boardroom.\n- **Testimonial overlays:** quote real participants (with consent) on the commute and the collar.",
     projected:[{label:"Projected return-rate reduction",value:-28,unit:"pct",description:"Hypothesis to test in the first 60 days of sales"}]},
    {workstream:"research",theme:0,title:"Test 3 collar silhouettes (prototype card sort)",impact:"medium",effort:"low",owner_team:"Research",
     body_md:"Show 3 prototype collar renders to the same respondents and find which collar height and stiffness reads as office-ready on camera and in person."},
    {workstream:"research",theme:null,title:"Validate women's oversized workwear demand",impact:"medium",effort:"medium",owner_team:"Research",
     body_md:"Validate demand for oversized officewear among working women aged 22–32 in Bengaluru, Mumbai and Pune: preferred silhouettes, fabric concerns on the commute, and willingness to pay between ₹1,499 and ₹2,299."}
  ],
  swatches:{"Mineral Sage":"#7D8F7A","Slate Gray":"#5B6470","Off-White Raw":"#E9E4D8","Deep Navy":"#232B3B","Bold prints":"#C2553A","Neon accents":"#B6E33C"}
},
skincare: {
  signalMap: {
    layering_confusion:["Layering confusion","critical"], tingling:["Tingling scare","negative"], breakout:["Breakout","negative"],
    no_reminder:["No reorder reminder","neutral"], slow_results:["Slow results","negative"], trust_gap:["Oxidation worry","negative"],
    simple_routine:["Wants 3-step card","positive"], checkin:["Day-3 check-in","positive"], trial_size:["Mini trial pack","positive"],
    ingredient_trust:["Ingredient honesty (+)","positive"]
  },
  pools: {
    1: [
      {t:"An Instagram reel about niacinamide. The before and after looked believable.",tags:[],s:0},
      {t:"My friend recommended the vitamin C serum. I wanted something Indian and affordable.",tags:[],s:1},
      {t:"It was on sale on Nykaa, then I ordered directly for the combo.",tags:[],s:0},
      {t:"I was trying to fix pigmentation and the ingredient list looked honest.",tags:["ingredient_trust"],s:1},
      {t:"A dermatologist-style post comparing actives. Yours had the percentages written clearly.",tags:["ingredient_trust"],s:1}
    ],
    2: [
      {t:"I had no idea what to apply first, serum or moisturiser. The box just says 'layer as needed'. What does that even mean?",tags:["layering_confusion"],s:-1},
      {t:"I used the serum and the exfoliant together on day one. Big mistake.",tags:["layering_confusion","tingling"],s:-1},
      {t:"Morning and night, exactly like the leaflet said. It was fine.",tags:[],s:1},
      {t:"The instructions are printed on the outer box, which I threw away the same day.",tags:["layering_confusion"],s:-1},
      {t:"I followed a YouTube routine instead of the brand's. Mixed results.",tags:["layering_confusion"],s:0}
    ],
    3: [
      {t:"There was a mild tingling and I panicked. Nobody told me that was normal, so I stopped.",tags:["tingling"],s:-1},
      {t:"I got a small breakout around day four and stopped everything.",tags:["tingling","breakout"],s:-1},
      {t:"Nothing bad. I just forgot to reorder and no reminder came.",tags:["no_reminder"],s:0},
      {t:"It worked slowly, and by week three I felt I'd wasted money.",tags:["slow_results"],s:-1},
      {t:"The serum turned a bit orange. I wasn't sure if it was still safe to use.",tags:["trust_gap"],s:-1}
    ],
    4: [
      {t:"A simple 3-step card: morning, night, and what not to mix.",tags:["simple_routine"],s:1},
      {t:"A WhatsApp check-in on day three asking how my skin feels.",tags:["checkin"],s:1},
      {t:"A smaller trial size so the risk feels lower.",tags:["trial_size"],s:1},
      {t:"Proof. Ingredient percentages and a patch-test guide.",tags:["ingredient_trust"],s:1},
      {t:"Honestly a good discount on the reorder would do it.",tags:[],s:0}
    ],
    5: [
      {v:["Routine card in the box"],t:"The routine card, definitely.",tags:["simple_routine"],s:1},
      {v:["Day-3 WhatsApp check-in"],t:"The day-3 check-in.",tags:["checkin"],s:1},
      {v:["Mini trial pack"],t:"Mini trial pack.",tags:["trial_size"],s:1},
      {v:["Discount on reorder"],t:"Discount on reorder.",tags:[],s:0},
      {v:["Routine card in the box","Day-3 WhatsApp check-in"],t:"Card plus the check-in.",tags:["simple_routine","checkin"],s:1}
    ]
  },
  themes: [
    {tags:["layering_confusion"],category:"friction",name:"Routine Confusion",headline:"Churn starts with layering instructions nobody reads",body:"Instructions live on the outer box, which buyers throw away. First-timers guess the order of serum, exfoliant and moisturiser, often badly.",metric:"Confused about layering"},
    {tags:["tingling","breakout"],category:"friction",name:"Tingling Panic",headline:"Mild tingling reads as a reaction, so first-timers stop",body:"Normal purging or tingling is read as an allergy. With no reassurance, buyers stop using the product in week one.",metric:"Stopped after tingling or a breakout"},
    {tags:["simple_routine","checkin"],category:"unmet_need",name:"Guided First Week",headline:"Buyers want a guided first week, not more products",body:"A routine card in the box and a day-3 check-in were the most requested fixes. Both reduce the fear of doing it wrong.",metric:"Ask for a routine card or check-in"},
    {tags:["ingredient_trust"],category:"buying_driver",name:"Ingredient Honesty",headline:"Clear percentages are why they bought in the first place",body:"Visible percentages and an honest ingredient list drove the first purchase. Keep them front and centre in reorder messaging.",metric:"Bought because of ingredient clarity"}
  ],
  headline:"High churn is tied to confusing layering instructions on the outer packaging; many first-timers stopped after mild tingling.",
  summary:"The product isn't failing. The first week is. Buyers who don't know the order of use, or who feel tingling with no warning, quietly stop and never reorder.",
  recs: [
    {workstream:"product",theme:0,title:"Put a 3-step routine card inside the box",impact:"high",effort:"low",track:"Packaging refresh",owner_team:"Product & Packaging",body_md:"- **Morning / night / never mix:** one card, three steps, inside the box rather than on the sleeve.\n- **Tingling note:** say what's normal in week one and when to stop."},
    {workstream:"gtm",theme:2,title:"Launch a day-3 WhatsApp check-in for first orders",impact:"high",effort:"medium",track:"Retention flows",owner_team:"CRM",body_md:"- **Day 3:** ask how the skin feels and link the routine video.\n- **Day 21:** reorder nudge with a refill pack.",projected:[{label:"Projected repeat-rate lift",value:12,unit:"pct",description:"Hypothesis, to be tested with an A/B holdout"}]},
    {workstream:"research",theme:1,title:"Patch-test reassurance follow-up",impact:"medium",effort:"low",owner_team:"Research",body_md:"Interview first-time buyers who stopped after tingling and test which reassurance message (patch-test guide, dermatologist note, or video) would have kept them using the product."}
  ]
},
snacks: {
  signalMap: {
    price_199:["₹199 impulse price","positive"], flavour_fatigue:["Flavour fatigue","negative"], ratings_trust:["Ratings drive trial","positive"],
    pack_confusion:["Pack size confusion","critical"], protein:["Protein on pack (+)","positive"]
  },
  pools: {
    1: [
      {v:["2–3 times a week"],t:"Two or three times a week, mostly late evenings.",tags:[],s:0},
      {v:["Daily"],t:"Daily, honestly. Zepto is faster than walking to the shop.",tags:[],s:1},
      {v:["Weekly"],t:"Once a week with the grocery order.",tags:[],s:0},
      {v:["2–3 times a week"],t:"A few times a week on Blinkit.",tags:[],s:0}
    ],
    2: [
      {v:199,t:"₹199 feels like an impulse add. At ₹249 I'd read the label first.",tags:["price_199"],s:1},
      {v:179,t:"Around ₹179. It's makhana, not dry fruits.",tags:["price_199"],s:0},
      {v:199,t:"Under ₹200 I don't think, I just add it to the cart.",tags:["price_199"],s:1},
      {v:189,t:"₹189 max for a brand I haven't tried.",tags:["price_199"],s:0},
      {v:249,t:"If the flavour is genuinely new, ₹249 is okay.",tags:["flavour_fatigue"],s:1},
      {v:159,t:"₹159. Otherwise I'll just buy the local pack.",tags:["price_199"],s:-1},
      {v:219,t:"₹219 if it's high protein.",tags:["protein"],s:1}
    ],
    3: [
      {v:["Flavour"],t:"Flavour, always.",tags:["flavour_fatigue"],s:0},
      {v:["Ratings & reviews"],t:"Ratings. I don't gamble on snacks.",tags:["ratings_trust"],s:0},
      {v:["Protein content"],t:"Protein per pack.",tags:["protein"],s:1},
      {v:["Price"],t:"Price first.",tags:["price_199"],s:0},
      {v:["Flavour","Ratings & reviews"],t:"Flavour, then ratings.",tags:["flavour_fatigue","ratings_trust"],s:0}
    ],
    4: [
      {t:"Peri-peri everything is boring now. Give me curry leaf or jaggery chilli.",tags:["flavour_fatigue"],s:-1},
      {t:"If it has 4.3 stars with a thousand ratings, I'll try it.",tags:["ratings_trust"],s:1},
      {t:"I never know if a pack is 60 g or 100 g until it arrives. The photos are misleading.",tags:["pack_confusion"],s:-1},
      {t:"Put the protein per pack on the front. I'm replacing chips with this.",tags:["protein"],s:1},
      {t:"If it's under ₹200 I don't think, I just add it.",tags:["price_199"],s:1},
      {t:"The grams are hidden in the fourth image. I felt cheated with a tiny pack once.",tags:["pack_confusion"],s:-1}
    ]
  },
  themes: [
    {tags:["price_199"],category:"buying_driver",name:"Impulse Ceiling",headline:"₹199 is the impulse ceiling; ₹249 triggers label-reading",body:"Below ₹200, makhana is an add-to-cart impulse on Blinkit and Zepto. Above it, shoppers compare grams and brands.",metric:"Impulse-buy at ₹199 or less"},
    {tags:["flavour_fatigue"],category:"unmet_need",name:"Flavour Fatigue",headline:"Peri-peri fatigue opens room for regional flavours",body:"Shoppers are bored of the same three flavours and would pay a little more for something genuinely new.",metric:"Want new flavours"},
    {tags:["ratings_trust"],category:"buying_driver",name:"Ratings Trust",headline:"Ratings decide trial for unknown snack brands",body:"With no brand recall, star ratings and review counts do the convincing.",metric:"Rely on ratings to try"},
    {tags:["pack_confusion"],category:"friction",name:"Pack Size Confusion",headline:"Hidden gram weights feel like a trick",body:"Gram weight buried in later images leaves shoppers feeling cheated by small packs.",metric:"Confused by pack size"}
  ],
  headline:"₹199 unlocks impulse adds on Blinkit and Zepto; ₹249 is a psychological barrier for artisanal makhana.",
  summary:"Price is the gate, flavour is the reason. Keep the hero SKU under ₹200, show grams and protein on the main image, and lead with a regional flavour.",
  priceQ:2,
  recs: [
    {workstream:"pricing",theme:0,title:"Launch the hero SKU at ₹199 for 90 g",impact:"high",effort:"low",track:"Q-commerce launch",owner_team:"Category",body_md:"- **₹199 price point** keeps makhana in impulse territory.\n- **90 g pack** protects margin versus 100 g.",willingnessAt:199,projected:[{label:"Projected trial basket lift",value:2.8,unit:"multiplier",description:"Hypothesis from quick-commerce benchmarks, not measured here"}]},
    {workstream:"product",theme:1,title:"Add two regional flavours: curry leaf and jaggery chilli",impact:"medium",effort:"medium",track:"NPD",owner_team:"R&D",body_md:"- **Curry leaf** and **jaggery chilli** were named unprompted.\n- Test both against peri-peri in a taste panel."},
    {workstream:"gtm",theme:3,title:"Show grams and protein on the first product image",impact:"medium",effort:"low",track:"Listings",owner_team:"E-commerce",body_md:"- Grams and protein per pack on image 1 on Blinkit, Zepto and Instamart."}
  ]
}
};

// Generic answer pools, used only when the AI is unavailable for a new study.
const GENERIC = {
  voice:[
    {t:"Price matters, but I've been burnt by D2C brands before, so I check reviews first.",tags:["trust_gap"],s:-1},
    {t:"If the quality is clearly better than what I buy now, I'd switch.",tags:["quality"],s:1},
    {t:"Delivery speed matters. If it takes a week, I'll forget I ordered it.",tags:["convenience"],s:0},
    {t:"I found my current brand on Instagram. A creator I trust used it.",tags:["discovery_social"],s:1},
    {t:"It has to feel worth the money. I compare with the big brands on sale.",tags:["price_sensitivity"],s:0},
    {t:"Returns are a pain. If returns are easy, I'm more likely to try.",tags:["trust_gap"],s:0}
  ],
  signalMap:{trust_gap:["Trust gap with new brands","negative"],quality:["Quality upgrade wanted","positive"],convenience:["Delivery speed","neutral"],discovery_social:["Creator discovery","positive"],price_sensitivity:["Price comparison","negative"]}
};

const PANEL_NAMES = {
  male:["Rahul","Aditya","Vikram","Nikhil","Aman","Kunal","Varun","Rohit","Sahil","Ankit","Harsh","Pranav","Ishaan","Yash","Kabir","Dev","Arnav","Rishi","Tanmay","Abhishek","Gaurav","Manish","Neeraj","Siddhant","Akash","Vivek","Raghav","Mihir","Omkar","Saurabh"],
  female:["Priya","Ananya","Sneha","Kavya","Isha","Meera","Pooja","Riya","Nidhi","Shruti","Aditi","Neha","Tanvi","Diya","Sanya","Aisha","Rhea","Ira","Simran","Divya","Kritika","Mansi","Pallavi","Radhika","Swati"]
};
const INDUSTRY_JOBS = {
  Tech:["Software Engineer at SaaS","Data Analyst at E-commerce","Frontend Developer at EdTech","QA Engineer at IT Services","Product Manager at SaaS"],
  Consulting:["Associate at Consulting Firm","Business Analyst at Big 4"],
  Agency:["Copywriter at Creative Agency","Media Planner at Ad Agency","Designer at Branding Studio"],
  FinTech:["Risk Analyst at FinTech","Ops Associate at Payments Co.","Product Designer at FinTech"],
  FMCG:["Sales Executive at FMCG","Brand Associate at FMCG"],
  Healthcare:["Pharmacist","Physiotherapist"],
  Education:["School Teacher","Academic Counsellor"],
  Retail:["Store Manager at Retail Chain","Merchandiser at Retail"],
  Student:["MBA Student","Engineering Student"]
};
const CITIES = [["Bengaluru",22],["Mumbai",18],["Pune",14],["Delhi NCR",16],["Hyderabad",10],["Chennai",7],["Kolkata",5],["Ahmedabad",4],["Jaipur",2],["Indore",2]];
