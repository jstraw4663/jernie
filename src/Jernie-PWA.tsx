import { useState, useEffect } from "react";

const WMO = {
  0:{e:"☀️",d:"Clear"},1:{e:"🌤️",d:"Mostly Clear"},2:{e:"⛅",d:"Partly Cloudy"},3:{e:"☁️",d:"Overcast"},
  45:{e:"🌫️",d:"Foggy"},48:{e:"🌫️",d:"Foggy"},51:{e:"🌦️",d:"Drizzle"},53:{e:"🌦️",d:"Drizzle"},
  55:{e:"🌧️",d:"Rain"},61:{e:"🌧️",d:"Light Rain"},63:{e:"🌧️",d:"Rain"},65:{e:"🌧️",d:"Heavy Rain"},
  71:{e:"🌨️",d:"Snow"},73:{e:"🌨️",d:"Snow"},75:{e:"❄️",d:"Heavy Snow"},80:{e:"🌦️",d:"Showers"},
  81:{e:"🌧️",d:"Showers"},82:{e:"⛈️",d:"Storms"},95:{e:"⛈️",d:"Thunderstorm"},99:{e:"⛈️",d:"Severe Storm"}
};
const wmo = c => WMO[c] || {e:"🌡️",d:"—"};
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const appleMaps = addr => "https://maps.apple.com/?q=" + encodeURIComponent(addr);

// ── Data ─────────────────────────────────────────────────────

const stops = [
  {
    id:"portland", city:"Portland, ME", dates:"May 22–24", emoji:"🦞", accent:"#2D6A8F",
    lat:43.6591, lon:-70.2568, wStart:"2026-05-22", wEnd:"2026-05-24",
    hotel:"Courtyard Downtown/Waterfront",
    hotelAddr:"321 Commercial St, Portland, ME 04101",
    hotelNote:"Solid location steps from Old Port. Use it as a base — eat everywhere else.",
    friendHotel:"Canopy by Hilton Portland Waterfront",
    friendHotelAddr:"70 Commercial St, Portland, ME 04101",
    friendHotelNote:"Stacy, Justin & Ford's home base in Portland.",
    bookings:[
      { icon:"✈️", label:"Outbound Flights — Jeremy & Jennie",
        flights:[
          {key:"WN351",  num:"WN 351",  airline:"Southwest", route:"CLT → BWI", dep:"8:20 AM",  arr:"9:50 AM",  date:"May 22"},
          {key:"WN2365", num:"WN 2365", airline:"Southwest", route:"BWI → PWM", dep:"10:40 AM", arr:"12:10 PM", date:"May 22"},
        ]
      },
      { icon:"🚗", label:"Rental Car — Avis",
        lines:["Full-Size SUV","Pickup: Portland International Jetport (PWM)","Drop-off: Bangor International Airport (BGR) — May 29","Confirmation: 08749981US2"]
      },
      { icon:"🦞", label:"Portland Lobstering Excursion — Lucky Catch Cruises",
        lines:["📅 Saturday, May 23 · 12:15 PM – 1:45 PM","📍 170 Commercial Street, Portland, ME","Portland Lobster Co. will cook your catch right after the cruise."],
        addr:"170 Commercial St, Portland, ME 04101"
      }
    ],
    itinerary:[
      {
        date:"Friday · May 22", label:"Arrival Day", emoji:"✈️",
        items:[
          {time:"12:10 PM", text:"Land at PWM · pick up Avis Full-Size SUV at the jetport", confirmed:true},
          {time:"1:30 PM", text:"Check in at Courtyard Downtown/Waterfront — drop bags, freshen up"},
          {time:"2:30 PM", text:"Portland Head Light · 15 min drive to Cape Elizabeth · most photographed lighthouse in New England · go while it's not crowded yet"},
          {time:"4:30 PM", text:"Old Port + Exchange Street · wander, browse, hit Ports of Call & Shipwreck & Cargo for souvenirs · grab Holy Donuts on the way back"},
          {time:"7:00 PM", text:"Dinner at Eventide Oyster Co. or Mr. Tuna · go early to beat the wait"},
        ]
      },
      {
        date:"Saturday · May 23", label:"Lobster Day", emoji:"🦞",
        items:[
          {time:"8:30 AM", text:"Breakfast at Tandem Coffee + Bakery · best breakfast sandwich in Portland · get there before 10am or expect a wait"},
          {time:"10:30 AM", text:"Spring Point Ledge Lighthouse (South Portland) or Peaks Island Ferry + golf cart · pick one for the morning"},
          {time:"12:15 PM", text:"⭐ Lucky Catch Lobstering Cruise · 170 Commercial St (CONFIRMED) · 90 min on the water hauling traps · Portland Lobster Co. cooks your catch right after", confirmed:true},
          {time:"2:30 PM", text:"Harbor Fish Market · waterfront institution since 1966 · worth walking through even if you don't buy"},
          {time:"3:30 PM", text:"Holy Donuts + Coastal Creamery · afternoon snack lap · non-negotiable"},
          {time:"7:00 PM", text:"Dinner at Scales · splurge night on the wharf · reserve ahead or you won't get in"},
        ]
      },
      {
        date:"Sunday · May 24", label:"Drive North to Bar Harbor", emoji:"🚗",
        items:[
          {time:"8:00 AM", text:"Breakfast at Becky's Diner · local institution · great chowder · no fuss"},
          {time:"9:30 AM", text:"Check out · load the SUV · ~2.5 hr drive to Bar Harbor via US-1"},
          {time:"11:30 AM", text:"Stop: Glisten Oyster Farm · Damariscotta, ME (on the US-1 route) · call ahead to confirm hours", alert:true},
          {time:"2:00 PM", text:"Arrive Bar Harbor · check in West Street Hotel + Bar Harbor Inn"},
          {time:"3:30 PM", text:"Agamont Park walk · bar harbor harbor stroll · get your bearings before dinner"},
          {time:"4:30 PM", text:"Bar Island low-tide crossing if tides align · check chart before going", alert:true},
          {time:"7:00 PM", text:"Dinner at Havana · BOOK NOW — Memorial Day weekend will fill it completely", confirmed:true},
        ]
      }
    ],
    restaurants:[
      {name:"Eventide Oyster Co.", type:"Seafood", must:true, rating:4.7, url:"https://www.eventideoysterco.com/portland", note:"Don't skip the brown butter lobster roll on a steamed bun. Expect a wait — go early or late.", source:"guide"},
      {name:"Scales", type:"Upscale Seafood", must:true, rating:4.6, url:"http://www.scalesrestaurant.com", note:"On the wharf with lobstermen docking outside the window. Splurge dinner of your Portland stay. Order the steamed lobster.", source:"guide"},
      {name:"Mr. Tuna", type:"Sushi / Local Seafood", must:true, rating:4.7, url:"https://www.mrtunamaine.com", note:"Food & Wine's #6 Best Restaurant in the Country (2025). Built around sustainable Gulf of Maine seafood. Get the Tuna de Tigre.", source:"guide"},
      {name:"Luke's Lobster", type:"Lobster Roll", must:true, rating:4.5, url:"https://lukeslobster.com/location/portland-pier", note:"The original Portland lobster shack, born right here on the pier. Clean, sweet claw-and-knuckle on a butter-toasted roll. Fast, affordable, and excellent for lunch.", source:"stacy"},
      {name:"Tandem Coffee + Bakery", type:"Breakfast", must:true, rating:4.6, url:"https://tandemcoffee.com", note:"Best breakfast sandwich in Portland. Counter service, communal tables. Get there before 10am. Their coffee program is serious — don't just grab and go.", source:"stacy"},
      {name:"Holy Donuts", type:"Snacks", must:true, rating:4.5, url:"https://theholydonut.com", note:"Portland-famous potato donuts in rotating flavors. Dark chocolate sea salt and maple bacon are the moves. There will be a line. Worth every second.", source:"stacy"},
      {name:"Via Vecchia", type:"Italian", must:false, rating:4.5, url:"https://www.viavecchiamaine.com", note:"Old-school Italian in a warm, candlelit Portland setting. Handmade pasta, wood-fired preparations. Perfect for a night when you need a break from seafood.", source:"stacy"},
      {name:"Cliff House Maine", type:"Upscale Dining / Views", must:false, rating:4.6, url:"https://www.cliffhousemaine.com", note:"⚠️ Actually located in York, ME — near Portland, not Bar Harbor. Cliffside views, fire pits, exceptional dinner. Worth it if you want a splurge night on the Portland end of the trip.", source:"stacy", flag:"Near Portland · not Bar Harbor"},
      {name:"Street & Co.", type:"Seafood Bistro", must:false, rating:4.5, url:"https://www.streetandcompany.net", note:"Candle-lit brick-and-beam room, unfussy fresh seafood. Jonah crab sauté and sole Francaise are standouts.", source:"guide"},
      {name:"Becky's Diner", type:"Breakfast", must:false, rating:4.4, url:"https://www.beckysdiner.com", note:"Local institution. Go before you drive north. Great chowder, no fuss.", source:"guide"},
      {name:"Bard Coffee", type:"Coffee", must:false, rating:4.6, url:"https://bardcoffee.com", note:"Specialty coffee in the Old Port. Single-origin pour-overs and excellent espresso. The right way to start any Portland morning.", source:"stacy"},
      {name:"Coastal Creamery", type:"Ice Cream", must:false, rating:4.4, url:"https://www.instagram.com/coastalcreameryme", note:"Local scoop shop in the Old Port. The correct way to end an afternoon walk. Great flavors built around Maine ingredients.", source:"stacy"},
      {name:"Harbor Fish Market", type:"Seafood Market", must:false, rating:4.7, url:"https://www.harborfish.com", note:"Old-school waterfront fish market, open since 1966. Walk through for the full experience even if you don't buy anything. Pure, uncut Portland.", source:"stacy"},
    ],
    activities:[
      {name:"Portland Head Light", note:"Most photographed lighthouse in New England. Fort Williams Park in Cape Elizabeth — 15 min from downtown. Rocky shoreline, dramatic drops to the sea. Go before golden hour for the best light.", url:"https://www.portlandheadlight.com", source:"stacy"},
      {name:"Old Port + Exchange Street", note:"Cobblestone waterfront district — wander, browse, eat. The heart of the city. Hit Ports of Call, Shipwreck & Cargo, and Soleil for souvenirs.", url:"https://www.portlandoldport.com", source:"guide"},
      {name:"Spring Point Ledge Lighthouse", note:"Walk the granite causeway right up to the lighthouse. Great harbor views back to Portland. Combine with the Spring Point Shoreway trail for a longer loop.", url:"https://www.springpointlighthouse.org", source:"stacy"},
      {name:"Peaks Island Ferry + Golf Cart", note:"17-minute Casco Bay Lines ferry to a car-free island. Rent a golf cart and circle the island at your own pace. Surreal, quiet, gorgeous views back to the Portland skyline.", url:"https://cascobaylines.com", source:"stacy"},
      {name:"Eastern Promenade Trail", note:"Scenic harbor overlook trail. Great for a morning walk before driving north.", url:"https://www.portlandmaine.gov/Facilities/Facility/Details/Eastern-Promenade-Trail-18", source:"guide"},
      {name:"Portland Fire Engine Co. City Tour", note:"Hop-on tour of Portland in a vintage fire engine. Touristy but genuinely fun — especially if Ford is along for the ride.", url:"https://portlandfireengineco.com", source:"stacy"},
      {name:"Kennebunkport Day Trip", note:"30 min south on US-1. Beautiful coastal village, Dock Square shopping, Walker's Point (Bush compound) visible from the water. Worth a half day if the schedule allows.", url:"https://www.gokennebunks.com", source:"stacy"},
    ],
    alerts:[]
  },

  {
    id:"barharbor", city:"Bar Harbor, ME", dates:"May 24–27", emoji:"🏔️", accent:"#1B4D3E",
    lat:44.3876, lon:-68.2039, wStart:"2026-05-24", wEnd:"2026-05-27",
    hotel:"West Street Hotel — King Ocean View",
    hotelAddr:"50 West St, Bar Harbor, ME 04609",
    hotelNote:"High floor harbor view room. Boutique, walkable to everything. Bar Harbor Club access included for hot tub & spa.",
    friendHotel:"Bar Harbor Inn",
    friendHotelAddr:"Newport Drive, Bar Harbor, ME 04609",
    friendHotelNote:"Stacy, Justin & Ford's stay — classic Bar Harbor property right on the water, steps from downtown.",
    bookings:[],
    itinerary:[
      {
        date:"Sunday · May 24", label:"Arrive Bar Harbor", emoji:"🚗",
        items:[
          {time:"2:00 PM", text:"Arrive from Portland · check in West Street Hotel & Bar Harbor Inn"},
          {time:"3:30 PM", text:"Agamont Park walk · waterfront stroll · get the lay of the land"},
          {time:"4:30 PM", text:"Bar Island low-tide crossing if tides allow · check chart before you go", alert:true},
          {time:"7:00 PM", text:"Dinner at Havana · reserve NOW — Memorial Day weekend fills completely", confirmed:true},
        ]
      },
      {
        date:"Monday · May 25", label:"Memorial Day", emoji:"🇺🇸",
        items:[
          {time:"7:30 AM", text:"Breakfast at Jeannie's Great Maine Breakfast · go early before it fills up"},
          {time:"9:30 AM", text:"Ocean Path Trail · easy 4-mile round trip · passes Thunder Hole, Sand Beach, Otter Cliff"},
          {time:"11:00 AM", text:"Thunder Hole · time your visit 1–2 hours before high tide for the best show", alert:true},
          {time:"1:00 PM", text:"Lunch at Peekytoe Provisions · freshest crab and lobster on the island"},
          {time:"3:00 PM", text:"Free time · beach · Ben & Bill's ice cream · Sherman's Books · relax"},
          {time:"Evening", text:"Memorial Day fireworks on Bar Harbor waterfront · check local schedule for exact time", alert:true},
        ]
      },
      {
        date:"Tuesday · May 26", label:"Hike Day 1 — Acadia", emoji:"🥾",
        items:[
          {time:"6:30 AM", text:"Beehive Trail — Jeremy & Jennie only (iron rungs, exposed cliffs, serious scramble). Stacy/Justin/Ford: Jordan Pond Loop instead (3.5 mi, easy, stunning glacial pond)"},
          {time:"10:30 AM", text:"Jordan Pond House Popovers · non-negotiable post-hike tradition · meet here as a group"},
          {time:"12:30 PM", text:"Thuya Garden · 20 min drive to Northeast Harbor · hidden formal hillside gardens · a quiet gem most tourists miss"},
          {time:"5:00 PM", text:"Sunset Sail from Bar Harbor pier · Margaret Todd tall ship or similar schooner · book in advance"},
          {time:"8:00 PM", text:"Dinner at The Reading Room (Bar Harbor Inn) · panoramic harbor views · dress up slightly"},
        ]
      },
      {
        date:"Wednesday · May 27", label:"Hike Day 2 + Move to Southwest Harbor", emoji:"🌅",
        items:[
          {time:"4:30 AM", text:"⭐ Cadillac Mountain Sunrise · first sunrise in the US · reserve summit road at Recreation.gov 2 days prior at 10am EST, or hike up on foot · no reservation needed for hikers", alert:true},
          {time:"8:30 AM", text:"Breakfast at Sunrise Cafe · best harbor views in Bar Harbor at breakfast"},
          {time:"10:30 AM", text:"Schoodic Peninsula drive · 45 min · dramatic pink granite shoreline · far fewer crowds than the main island"},
          {time:"1:00 PM", text:"Last lunch in Bar Harbor · Side Street Cafe lobster roll"},
          {time:"3:00 PM", text:"Check out · drive to Southwest Harbor (~30 min)"},
          {time:"4:30 PM", text:"Check in at The Claremont · settle into your rooms · take in the Somes Sound view"},
          {time:"7:00 PM", text:"Dinner at Little Fern at The Claremont · reserve before you leave home", confirmed:true},
        ]
      }
    ],
    restaurants:[
      {name:"Havana", type:"American Fine Dining / Latin", must:true, rating:4.6, url:"https://www.havana318.com", note:"2025 James Beard Award semifinalist. Best restaurant in Bar Harbor by a mile. Book NOW — it will be full Memorial Day weekend. Get the seafood paella and lobster moqueca.", source:"guide"},
      {name:"Peekytoe Provisions", type:"Seafood", must:true, rating:4.6, url:"https://www.peekytoeprovisions.com", note:"Best crab and lobster on the island. Seafood brought in fresh daily. Great for lunch after hiking.", source:"guide"},
      {name:"Jeannie's Great Maine Breakfast", type:"Breakfast", must:true, rating:4.4, url:"https://www.jeanniesgreatmainebreakfast.com", note:"Buttermilk blueberry pancakes so loaded with berries the edges turn deep blue. Go early — it fills up fast.", source:"guide"},
      {name:"The Reading Room", type:"Upscale Dining", must:true, rating:4.7, url:"https://www.barharborinn.com/dining", note:"Historic dining room inside the Bar Harbor Inn. Panoramic harbor views from nearly every seat. One splurge dinner for the setting alone — dress up slightly.", source:"stacy"},
      {name:"Sweet Pea's Farm Kitchen", type:"Farm-to-Table", must:true, rating:4.5, url:"https://www.sweetpeasfarmkitchen.com", note:"Tucked inside a working garden in full bloom. Farm-to-table breakfast and lunch with produce coming out of the ground that morning. Go with daylight — the garden is the whole point.", source:"stacy"},
      {name:"McLoon's Lobster", type:"Lobster Shack", must:true, rating:4.7, url:"https://mcloons.com", note:"⚠️ NOT in Bar Harbor — this is in Spruce Head near Rockland, ~1.5 hrs south. It's an incredible stop on the Portland → Bar Harbor drive if you route through Thomaston/Rockland. Don't plan it as a BH dinner.", source:"stacy", flag:"Near Rockland · stop on drive from Portland"},
      {name:"McKay's Public House", type:"Casual Dinner", must:false, rating:4.4, url:"https://www.mckayspublichouse.com", note:"Cozy Bar Harbor gastropub. Good burgers and local seafood in an unfussy setting. Great for a lower-key dinner night.", source:"stacy"},
      {name:"Sunrise Cafe", type:"Breakfast", must:false, rating:4.4, url:"https://www.sunrisecafebarharbor.com", note:"Best breakfast views in Bar Harbor. Eggs, pancakes, harbor out every window. Perfect after an early Cadillac Mountain sunrise.", source:"stacy"},
      {name:"Abel's on the Water", type:"Waterfront Dining", must:false, rating:4.4, url:"https://abelsonthewater.com", note:"Casual waterfront dining on Eagle Lake, ~20 min from town. Fresh lobster and fish on the water. A quieter alternative to downtown.", source:"stacy"},
      {name:"Side Street Cafe", type:"Casual Lobster Roll", must:false, rating:4.4, url:"https://www.sidestreetbarharbor.com", note:"Local go-to for a classic lobster roll at a fair price. Patio seating, no pretense.", source:"guide"},
      {name:"Ben & Bill's Chocolate Emporium", type:"Ice Cream", must:false, rating:4.4, url:"https://www.benandbills.com", note:"Bar Harbor institution. Famous for outrageous flavors including the polarizing lobster ice cream. A rite of passage whether you finish the cone or not.", source:"stacy"},
      {name:"Rose Eden Lobster", type:"Seafood Takeout", must:false, rating:4.5, url:"https://www.roseedenlobster.com", note:"Opens Memorial Day weekend. Grab lobster to-go and eat on the harbor. The quintessential Maine moment.", source:"guide"},
    ],
    activities:[
      {name:"Beehive Trail ⭐", note:"Best hike in the park. Iron rungs bolted into cliff faces, exposed ledges, ocean views. Jeremy & Jennie only — not suitable for everyone. Athletic and dramatic.", url:"https://www.nps.gov/acad/planyourvisit/the-beehive-trail.htm", source:"guide"},
      {name:"Cadillac Mountain Sunrise 🌅", note:"Cadillac is the first place in the contiguous US to see sunrise in late spring. Set your alarm for 3:30am. Summit road reservation required via Recreation.gov 2 days prior at 10am EST — or hike up, no reservation needed on foot.", url:"https://www.nps.gov/acad/planyourvisit/cadillac-north-ridge-trail.htm", source:"stacy"},
      {name:"Ocean Path Trail", note:"Easy 4-mile round trip along dramatic rocky shoreline. Passes Thunder Hole, Sand Beach, and Otter Cliff. Perfect for the full group on a non-hiking day.", url:"https://www.nps.gov/acad/planyourvisit/ocean-path.htm", source:"stacy"},
      {name:"Thunder Hole", note:"Carved sea cave along Ocean Path. Ocean swells compress into the cave and blast upward — go 1–2 hours before high tide for maximum drama. Check tide charts before you go.", url:"https://www.nps.gov/acad/planyourvisit/thunder-hole.htm", source:"stacy"},
      {name:"Jordan Pond Loop + Popovers", note:"Stunning glacial pond surrounded by peaks. 3.5 miles, flat and easy. The Jordan Pond House serves famous popovers with jam and tea right after — don't skip it.", url:"https://www.nps.gov/acad/planyourvisit/jordan-pond-path.htm", source:"guide"},
      {name:"Thuya Garden", note:"Hidden formal garden in Northeast Harbor, 20 min from Bar Harbor. Immaculate hillside gardens above a serene pond. A quiet gem most tourists completely miss — especially beautiful in late May bloom.", url:"https://gardenpreserve.org/thuya-garden", source:"stacy"},
      {name:"Schoodic Peninsula", note:"Underrated section of Acadia, 45 min from Bar Harbor. Pink granite shoreline meets open Atlantic. Far fewer crowds than the main island — dramatic, raw, and worth every minute of the drive.", url:"https://www.nps.gov/acad/planyourvisit/schoodic.htm", source:"stacy"},
      {name:"Sunset Sail", note:"Several schooner options depart from the Bar Harbor pier. The Margaret Todd tall ship is the classic — 2-hour sail into Frenchman Bay at golden hour. Book a few days ahead.", url:"https://downeastwindjammer.com", source:"stacy"},
      {name:"Bar Island at Low Tide", note:"A land bridge connects downtown to Bar Island at low tide only. Walk across, hike up for harbor views, get back before the tide covers the crossing. Check charts — the window is short.", url:"https://www.nps.gov/acad/planyourvisit/bar-island-trail.htm", source:"guide"},
      {name:"Ship Harbor Trail", note:"Easy 1.3-mile loop through spruce forest to a rocky shoreline. Great short walk on the quieter western side of the island — no crowds.", url:"https://www.nps.gov/acad/planyourvisit/ship-harbor-trail.htm", source:"stacy"},
      {name:"Agamont Park", note:"Small but beautiful waterfront park in downtown Bar Harbor. Easy harbor stroll, great views. Good first walk after you arrive to get oriented.", url:"https://www.barharbormaine.gov/213/Agamont-Park", source:"stacy"},
      {name:"Sherman's Books & Stationery", note:"Best bookstore in Bar Harbor. Excellent local Maine section, great gifts. Hard to leave empty-handed.", url:"https://shermans.com", source:"stacy"},
      {name:"The Annex", note:"Bar with live music most nights in season. Good spot to end any evening — especially after a long hike day when dinner is done and no one wants to sleep yet.", url:"https://www.facebook.com/theannexbarharbor", source:"stacy"},
    ],
    alerts:[
      {type:"warning", text:"🚗 Cadillac Summit Road requires a vehicle reservation via Recreation.gov (May 21–Oct 25). Opens 2 days prior at 10am EST. Set a reminder — or just hike up on foot. No reservation needed for hikers."},
      {type:"warning", text:"📍 McLoon's Lobster is NOT in Bar Harbor — it's in Spruce Head near Rockland (~1.5 hrs south). Excellent stop on the Portland → Bar Harbor drive if you route through Rockland. Wrong city for a Bar Harbor dinner plan."},
      {type:"warning", text:"📍 Cliff House Maine is also NOT Bar Harbor — it's in York, ME near Portland. See it listed under the Portland tab if you want to work it into that leg of the trip."},
      {type:"info", text:"🥾 Late May = end of mud season. Expect wet/muddy trails especially at lower elevations. Waterproof hiking boots are not optional."},
      {type:"tip", text:"🎟️ Buy an America the Beautiful National Parks Pass ($80) before you go. Covers Acadia's $35 entrance fee plus every other national park for a year."},
      {type:"tip", text:"📶 Verizon data is nearly non-existent in Bar Harbor — locals confirm it. T-Mobile works great here. Download the T-Mobile app before the trip and activate their 30-day free eSIM trial (tmobile.com/iphone-test-drive). Takes 5 min to set up as a secondary line — switch your primary data source to T-Mobile and you're good. Especially critical for tide charts, trail maps, and navigation on the island."},
    ]
  },

  {
    id:"swh", city:"Southwest Harbor", dates:"May 27–29", emoji:"⚓", accent:"#7B3F2B",
    lat:44.2790, lon:-68.3259, wStart:"2026-05-27", wEnd:"2026-05-29",
    hotel:"The Claremont Hotel — Phillips House King w/ Deck",
    hotelAddr:"22 Claremont Rd, Southwest Harbor, ME 04679",
    hotelNote:"Historic 1883 property, fully renovated 2021. Gas fireplace, private deck, partial Somes Sound views. This is the decompression leg of the trip — slow down and enjoy it.",
    friendHotel:"The Claremont Hotel — Ocean View 1BR Cottage",
    friendHotelAddr:"22 Claremont Rd, Southwest Harbor, ME 04679",
    friendHotelNote:"Stacy, Justin & Ford's cottage on the Claremont grounds — private, right on the water. Everyone's at the same property for this leg.",
    bookings:[
      { icon:"✈️", label:"Return Flight — Jeremy & Jennie",
        flights:[
          {key:"AA1463", num:"AA 1463", airline:"American Airlines", route:"BGR → CLT", dep:"2:22 PM", arr:"5:17 PM", date:"May 29"}
        ]
      },
      { icon:"🚗", label:"Rental Car Drop-Off — Avis at BGR",
        lines:["Full-Size SUV return","📍 287 Godfrey Blvd, Bangor, ME 04401 (Bangor Intl Airport)","⏰ Allow ~30 min from The Claremont — plan checkout accordingly."],
        addr:"287 Godfrey Blvd, Bangor, ME 04401"
      }
    ],
    itinerary:[
      {
        date:"Thursday · May 28", label:"Relaxation Day", emoji:"🧘",
        items:[
          {time:"Morning", text:"Sleep in. Breakfast on your deck with Somes Sound views. This is the decompression leg — slow down and mean it."},
          {time:"10:00 AM", text:"Botanica Spa at The Claremont · book a massage before you arrive · after 3 days of Acadia hiking your body will demand it", alert:true},
          {time:"12:00 PM", text:"Lunch at Batson River Fish Camp · lobster rolls on The Claremont's private dock"},
          {time:"2:00 PM", text:"Acadia Mountain Trail (2.5 mi RT, steep, outstanding Somes Sound views) or Beech Mountain + Fire Tower for 360° views"},
          {time:"5:00 PM", text:"Bass Harbor Head Lighthouse · 15 min drive · go at golden hour · one of the most photographed shots on the East Coast"},
          {time:"6:30 PM", text:"Pre-dinner drinks at Harry's Bar at The Claremont"},
          {time:"7:30 PM", text:"Dinner at Little Fern at The Claremont · reserve before you leave home", confirmed:true},
        ]
      },
      {
        date:"Friday · May 29", label:"Travel Home", emoji:"✈️",
        items:[
          {time:"Morning", text:"Final breakfast · last coffee on the deck · pack and say goodbye to Somes Sound"},
          {time:"10:00 AM", text:"Check out of The Claremont"},
          {time:"10:30 AM", text:"Drive to Bangor Airport · ~30 min · return Avis SUV at BGR", confirmed:true},
          {time:"12:00 PM", text:"Arrive BGR early · check in · clear security · lunch airside"},
          {time:"2:22 PM", text:"✈️ AA 1463 departs BGR → CLT (CONFIRMED)", confirmed:true},
          {time:"5:17 PM", text:"Land Charlotte · trip complete · go eat a mediocre dinner and miss Maine immediately 🦞"},
        ]
      }
    ],
    restaurants:[
      {name:"Little Fern at The Claremont", type:"Fine Dining", must:true, rating:4.7, url:"https://theclaremonthotel.com/dining", note:"Best restaurant on this side of the island. Panoramic Somes Sound views, fireplace, exceptional food. Reserve before you leave home — don't try to walk in.", source:"guide"},
      {name:"Batson River Fish Camp", type:"Casual Dock Dining", must:true, rating:4.5, url:"https://theclaremonthotel.com/dining", note:"Right on The Claremont's private dock. Lobster rolls, cold drinks, on the water. Perfect lunch every day you're here.", source:"guide"},
      {name:"Harry's Bar at The Claremont", type:"Bar", must:false, rating:4.4, url:"https://theclaremonthotel.com/dining", note:"Where the evening starts. Classic cocktails, great atmosphere. Pre-dinner drinks here every night.", source:"guide"},
    ],
    activities:[
      {name:"Bass Harbor Head Lighthouse", note:"15 min from Southwest Harbor. One of the most photographed lighthouses on the East Coast — set dramatically into rocky shoreline. Go at golden hour. Arrive early to claim a spot on the rocks below.", url:"https://www.nps.gov/acad/planyourvisit/bass-harbor-head-lighthouse.htm", source:"guide"},
      {name:"Acadia Mountain Trail", note:"Short (2.5 mi RT), steep, and the views of Somes Sound from the summit are outstanding. Perfect final hike before a relaxed dinner.", url:"https://www.nps.gov/acad/planyourvisit/acadia-mountain-trail.htm", source:"guide"},
      {name:"Beech Mountain + Fire Tower", note:"Great moderate hike on the quiet western side of the island. Far fewer crowds than the Bar Harbor side. Fire tower at the top with 360° views of the island.", url:"https://www.nps.gov/acad/planyourvisit/beech-mountain-loop-trail.htm", source:"guide"},
      {name:"Botanica Spa at The Claremont", note:"Book a massage before you arrive. After 3 days of Acadia hiking, your legs will demand it. Walk-ins are unlikely to work during Memorial Day weekend.", url:"https://theclaremonthotel.com/spa", source:"guide"},
    ],
    alerts:[
      {type:"warning", text:"✈️ Flying out of BGR (Bangor) on May 29. The Claremont is ~30 min from BGR. Know your flight time and plan checkout accordingly — don't cut it close."},
    ]
  }
];

// ── API Functions ─────────────────────────────────────────────

async function fetchWeatherForStop(s) {
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lon + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=" + s.wStart + "&end_date=" + s.wEnd;
    const r = await fetch(url);
    const d = await r.json();
    if (d.error || !d.daily?.time?.length) return null;
    return d.daily;
  } catch { return null; }
}

async function fetchFlightStatuses(setStatus, setLoading, setUpdated) {
  setLoading(true);
  const sysPrompt = "You are a flight status assistant. Search for the current real-time status of each flight. Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Each element must include: {\"key\":\"\",\"status\":\"On Time|Delayed|Cancelled|Scheduled\",\"actualDep\":\"\",\"actualArr\":\"\",\"gate\":\"\",\"terminal\":\"\",\"delayMin\":0}. If real-time data is unavailable use status Scheduled and empty strings for actual times.";
  const flights = [
    {key:"WN351",  flight:"Southwest WN351",         route:"Charlotte CLT to Baltimore BWI",      date:"May 22 2026", schedDep:"8:20 AM",  schedArr:"9:50 AM"},
    {key:"WN2365", flight:"Southwest WN2365",         route:"Baltimore BWI to Portland Maine PWM", date:"May 22 2026", schedDep:"10:40 AM", schedArr:"12:10 PM"},
    {key:"AA1463", flight:"American Airlines AA1463", route:"Bangor BGR to Charlotte CLT",         date:"May 29 2026", schedDep:"2:22 PM",  schedArr:"5:17 PM"}
  ];
  const userMsg = "Get current status for these flights and return a JSON array only: " + JSON.stringify(flights);
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:1000,
        tools:[{type:"web_search_20250305",name:"web_search"}],
        system:sysPrompt,
        messages:[{role:"user",content:userMsg}]
      })
    });
    const data = await resp.json();
    const txt = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
    const arr = JSON.parse(txt.replace(/```json|```/g,"").trim());
    const map = {};
    arr.forEach(f => { map[f.key] = f; });
    setStatus(map);
  } catch(e) { setStatus({}); }
  setLoading(false);
  setUpdated(new Date());
}

// ── Sub-components ────────────────────────────────────────────

function AlertBox({type, text}) {
  const s = ({warning:{bg:"#FFF8E7",bd:"#E8A020"},info:{bg:"#EBF4F8",bd:"#2D6A8F"},tip:{bg:"#EDFAF1",bd:"#1B7A4A"}})[type]||{bg:"#EBF4F8",bd:"#2D6A8F"};
  return <div style={{background:s.bg,borderLeft:"4px solid "+s.bd,borderRadius:"0 8px 8px 0",padding:"12px 16px",marginBottom:"10px",fontSize:"0.87rem",lineHeight:1.55,color:"#2a2a2a"}}>{text}</div>;
}

function SecHead({color, label}) {
  return <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
    <div style={{fontWeight:"bold",color,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>{label}</div>
    <div style={{flex:1,height:"1px",background:color+"30"}}/>
  </div>;
}

function StarRating({rating}) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return <span style={{display:"inline-flex",alignItems:"center",gap:"2px",fontSize:"0.72rem"}}>
    {[1,2,3,4,5].map(i=>(
      <span key={i} style={{color:i<=full?"#F59E0B":(i===full+1&&half?"#F59E0B":"#ddd"),fontSize:"0.75rem"}}>
        {i<=full?"★":(i===full+1&&half?"⯨":"★")}
      </span>
    ))}
    <span style={{color:"#888",marginLeft:"3px",fontFamily:"Georgia,serif"}}>{rating}</span>
  </span>;
}

function HotelCard({accent, label, hotel, hotelAddr, note, secondary}) {
  return <div style={{background:secondary?"#FAFAF7":"#fff",border:"1px solid "+accent+(secondary?"20":"30"),borderLeft:"5px solid "+(secondary?accent+"70":accent),borderRadius:"0 12px 12px 0",padding:"18px 22px"}}>
    <div style={{fontSize:"0.68rem",letterSpacing:"0.22em",textTransform:"uppercase",color:secondary?"#888":accent,marginBottom:"6px"}}>{label}</div>
    <div style={{fontWeight:"bold",fontSize:"1rem",marginBottom:"4px",color:secondary?"#444":"#1a1a1a"}}>{hotel}</div>
    {hotelAddr&&<a href={appleMaps(hotelAddr)} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"0.78rem",color:secondary?"#999":accent,textDecoration:"none",marginBottom:"6px",opacity:0.85}}>📍 {hotelAddr} <span style={{fontSize:"0.7rem",opacity:0.7}}>↗</span></a>}
    <div style={{color:"#666",fontSize:"0.86rem",lineHeight:1.6,fontStyle:"italic"}}>{note}</div>
  </div>;
}

function StatusBadge({status}) {
  const cfg = {"On Time":{bg:"#EDFAF1",color:"#1B7A4A",dot:"#1B7A4A"},"Delayed":{bg:"#FFF8E7",color:"#b07010",dot:"#E8A020"},"Cancelled":{bg:"#FEF2F2",color:"#b91c1c",dot:"#ef4444"},"Scheduled":{bg:"#EBF4F8",color:"#2D6A8F",dot:"#2D6A8F"}}[status]||{bg:"#f5f5f5",color:"#888",dot:"#aaa"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:cfg.bg,color:cfg.color,fontSize:"0.7rem",fontWeight:"bold",padding:"2px 9px",borderRadius:"20px",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
    <span style={{width:"6px",height:"6px",borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>{status}
  </span>;
}

function FlightRow({f, sMap, loading}) {
  const s = sMap?.[f.key];
  const delayed = s?.delayMin > 0;
  const actualDep = s?.actualDep && s.actualDep !== f.dep ? s.actualDep : null;
  const actualArr = s?.actualArr && s.actualArr !== f.arr ? s.actualArr : null;
  return <div style={{borderTop:"1px solid #f0ede6",paddingTop:"11px",marginTop:"11px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"6px",marginBottom:"8px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
        <span style={{fontWeight:"bold",fontSize:"0.96rem"}}>{f.num}</span>
        <span style={{color:"#999",fontSize:"0.8rem"}}>{f.airline}</span>
        <span style={{color:"#ccc",fontSize:"0.8rem"}}>·</span>
        <span style={{color:"#666",fontSize:"0.82rem"}}>{f.route}</span>
        <span style={{color:"#ccc",fontSize:"0.8rem"}}>·</span>
        <span style={{color:"#999",fontSize:"0.8rem"}}>{f.date}</span>
      </div>
      {loading?<span style={{fontSize:"0.72rem",color:"#aaa"}}>Checking…</span>:s&&<StatusBadge status={s.status||"Unknown"}/>}
    </div>
    <div style={{display:"flex",gap:"20px",flexWrap:"wrap"}}>
      {[["Departs",f.dep,actualDep],["Arrives",f.arr,actualArr]].map(([lbl,sched,actual])=>(
        <div key={lbl}>
          <div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>{lbl}</div>
          <div style={{fontWeight:"bold",fontSize:"0.9rem",display:"flex",alignItems:"center",gap:"5px"}}>
            {actual?<><span style={{textDecoration:"line-through",color:"#ccc",fontWeight:"normal",fontSize:"0.8rem"}}>{sched}</span><span style={{color:delayed?"#b07010":"#1B7A4A"}}>{actual}</span></>:sched}
          </div>
        </div>
      ))}
      {s?.gate&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Gate</div><div style={{fontWeight:"bold",fontSize:"0.9rem"}}>{s.gate}</div></div>}
      {delayed&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Delay</div><div style={{fontWeight:"bold",fontSize:"0.9rem",color:"#b07010"}}>+{s.delayMin} min</div></div>}
    </div>
  </div>;
}

function BookingCard({booking, accent, flightStatus, flightLoading}) {
  return <div style={{background:"#fff",border:"1px solid "+accent+"25",borderRadius:"10px",padding:"15px 18px",display:"flex",gap:"14px",alignItems:"flex-start"}}>
    <div style={{fontSize:"1.3rem",lineHeight:1,marginTop:"2px",flexShrink:0}}>{booking.icon}</div>
    <div style={{flex:1}}>
      <div style={{fontWeight:"bold",color:"#777",fontSize:"0.7rem",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"8px"}}>{booking.label}</div>
      {booking.flights?.map((f,i)=><FlightRow key={i} f={f} sMap={flightStatus} loading={flightLoading}/>)}
      {booking.lines?.map((l,i)=>{
        const isAddr=l.startsWith("📍");
        return <div key={i} style={{fontSize:"0.86rem",lineHeight:1.6,marginBottom:"2px",fontWeight:i===0?"600":"normal",color:l.startsWith("⏰")||l.startsWith("📅")?"#666":"#222"}}>
          {isAddr&&booking.addr?<a href={appleMaps(booking.addr)} target="_blank" rel="noopener noreferrer" style={{color:accent,textDecoration:"none"}}>{l} <span style={{fontSize:"0.7rem",opacity:0.7}}>↗ Open in Maps</span></a>:l}
        </div>;
      })}
    </div>
  </div>;
}

function WeatherStrip({stop, weatherData}) {
  const data = weatherData[stop.id];
  const tripStart = new Date(stop.wStart+"T12:00:00");
  const today = new Date();
  const daysOut = Math.ceil((tripStart-today)/(1000*60*60*24));
  const availDate = new Date(tripStart.getTime()-15*24*60*60*1000).toLocaleDateString("en-US",{month:"long",day:"numeric"});
  return <div style={{marginBottom:"22px"}}>
    <div style={{fontSize:"0.72rem",fontWeight:"bold",color:stop.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"9px"}}>🌤️ Forecast — {stop.city}</div>
    {!data?(
      <div style={{background:stop.accent+"08",border:"1px dashed "+stop.accent+"30",borderRadius:"10px",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px"}}>
        <span style={{fontSize:"1.6rem"}}>📅</span>
        <div>
          <div style={{fontWeight:"bold",fontSize:"0.85rem",color:"#444"}}>Forecast not yet available</div>
          <div style={{fontSize:"0.8rem",color:"#888",marginTop:"2px"}}>{daysOut>16?"Opens around "+availDate+" ("+daysOut+" days out). Will auto-populate on page refresh.":"Loading weather data…"}</div>
        </div>
      </div>
    ):(
      <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"2px"}}>
        {data.time.map((dt,i)=>{
          const d=new Date(dt+"T12:00:00");
          const w=wmo(data.weathercode[i]);
          const hi=Math.round(data.temperature_2m_max[i]);
          const lo=Math.round(data.temperature_2m_min[i]);
          const precip=data.precipitation_probability_max[i];
          return <div key={i} style={{flex:"0 0 auto",minWidth:"84px",background:"#fff",border:"1px solid "+stop.accent+"22",borderRadius:"12px",padding:"12px 10px",textAlign:"center",boxShadow:"0 1px 5px "+stop.accent+"0D"}}>
            <div style={{fontSize:"0.68rem",fontWeight:"bold",color:"#888",letterSpacing:"0.06em"}}>{DAYS[d.getDay()]}</div>
            <div style={{fontSize:"0.68rem",color:"#ccc",marginBottom:"7px"}}>{d.getMonth()+1}/{d.getDate()}</div>
            <div style={{fontSize:"1.6rem",lineHeight:1,marginBottom:"5px"}}>{w.e}</div>
            <div style={{fontSize:"0.68rem",color:"#aaa",marginBottom:"5px"}}>{w.d}</div>
            <div style={{fontWeight:"bold",fontSize:"0.88rem",color:"#333"}}>{hi}°<span style={{fontWeight:"normal",color:"#bbb",fontSize:"0.78rem"}}> {lo}°</span></div>
            <div style={{fontSize:"0.7rem",color:precip>50?"#2D6A8F":"#ccc",marginTop:"4px",fontWeight:precip>50?"bold":"normal"}}>💧{precip}%</div>
          </div>;
        })}
      </div>
    )}
  </div>;
}

function DailyItinerary({stop}) {
  const [openDay, setOpenDay] = useState(0);
  return (
    <div style={{marginBottom:"28px"}}>
      <SecHead color={stop.accent} label="📅 Daily Itinerary — Loose Plan"/>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {stop.itinerary.map((day,di)=>(
          <div key={di} style={{border:"1px solid "+stop.accent+(openDay===di?"40":"20"),borderRadius:"12px",overflow:"hidden",background:"#fff",transition:"border-color 0.15s"}}>
            <button onClick={()=>setOpenDay(openDay===di?-1:di)}
              style={{width:"100%",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px",background:openDay===di?stop.accent+"0A":"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Georgia,serif",transition:"background 0.15s"}}>
              <span style={{fontSize:"1.25rem",flexShrink:0}}>{day.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:"bold",fontSize:"0.92rem",color:"#1a1a1a"}}>{day.date}</div>
                <div style={{fontSize:"0.75rem",color:"#888",marginTop:"2px",fontStyle:"italic"}}>{day.label}</div>
              </div>
              <span style={{color:stop.accent,fontSize:"0.75rem",transition:"transform 0.15s",display:"inline-block",transform:openDay===di?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
            </button>
            {openDay===di&&(
              <div style={{padding:"0 18px 14px 18px",borderTop:"1px solid "+stop.accent+"15"}}>
                {day.items.map((item,ii)=>(
                  <div key={ii} style={{display:"flex",gap:"12px",padding:"10px 0",borderBottom:ii<day.items.length-1?"1px dashed #f0ede6":"none",alignItems:"flex-start"}}>
                    <div style={{minWidth:"68px",fontSize:"0.7rem",color:"#bbb",paddingTop:"3px",flexShrink:0,fontVariantNumeric:"tabular-nums",lineHeight:1.4}}>{item.time}</div>
                    <div style={{flex:1,display:"flex",alignItems:"flex-start",gap:"7px"}}>
                      {item.confirmed&&<span style={{background:stop.accent,color:"#fff",fontSize:"0.55rem",padding:"2px 6px",borderRadius:"4px",whiteSpace:"nowrap",marginTop:"3px",flexShrink:0,letterSpacing:"0.06em",textTransform:"uppercase"}}>✓ Confirmed</span>}
                      {item.alert&&!item.confirmed&&<span style={{background:"#FFF8E7",color:"#b07010",fontSize:"0.55rem",padding:"2px 6px",borderRadius:"4px",whiteSpace:"nowrap",marginTop:"3px",flexShrink:0,letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #E8A02050"}}>⚠ Note</span>}
                      <div style={{fontSize:"0.86rem",color:"#333",lineHeight:1.55}}>{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function MaineGuide() {
  const [active, setActive] = useState("portland");
  const [weatherData, setWeatherData] = useState({});
  const [flightStatus, setFlightStatus] = useState({});
  const [flightLoading, setFlightLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const stop = stops.find(s=>s.id===active);
  const hasFlights = stop.bookings.some(b=>b.flights);

  useEffect(()=>{
    stops.forEach(async s=>{
      const d = await fetchWeatherForStop(s);
      if(d) setWeatherData(prev=>({...prev,[s.id]:d}));
    });
    fetchFlightStatuses(setFlightStatus,setFlightLoading,setLastUpdated);
  },[]);

  return (
    <div style={{fontFamily:"Georgia,'Times New Roman',serif",background:"#F5F0E8",minHeight:"100vh",color:"#1a1a1a"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0D2B3E 0%,#1B4D6B 60%,#0D2B3E 100%)",padding:"52px 24px 44px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%,rgba(255,255,255,0.05) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.04) 0%,transparent 50%)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.3em",color:"#A8C4D4",textTransform:"uppercase",marginBottom:"14px"}}>May 22 – 29, 2026</div>
          <h1 style={{margin:0,fontSize:"clamp(1.9rem,5vw,3.1rem)",fontWeight:"normal",color:"#FDFAF4",lineHeight:1.1,letterSpacing:"-0.01em"}}>Maine Coast Trip Guide</h1>
          <p style={{margin:"14px auto 0",maxWidth:"520px",color:"#A8C4D4",fontSize:"1rem",lineHeight:1.6,fontStyle:"italic"}}>Jeremy & Jennie · Stacy, Justin & Ford · May 2026</p>
          <p style={{margin:"6px auto 0",maxWidth:"500px",color:"#7A9FB5",fontSize:"0.88rem",fontStyle:"italic"}}>Portland → Bar Harbor & Acadia → Southwest Harbor</p>
          <div style={{marginTop:"20px",display:"flex",justifyContent:"center",gap:"28px",flexWrap:"wrap"}}>
            {[["🦞","Seafood-focused"],["🏔️","Acadia hiking"],["🛏️","Boutique stays"]].map(([e,l])=>(
              <div key={l} style={{color:"#C8DDE8",fontSize:"0.8rem",letterSpacing:"0.04em"}}>{e} {l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"2px solid #D4C9B0",background:"#EDE8DC",overflowX:"auto"}}>
        {stops.map(s=>(
          <button key={s.id} onClick={()=>setActive(s.id)} style={{flex:"1 1 auto",minWidth:"110px",padding:"14px 16px",border:"none",background:active===s.id?"#F5F0E8":"transparent",borderBottom:active===s.id?"3px solid "+s.accent:"3px solid transparent",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:"0.88rem",color:active===s.id?s.accent:"#666",fontWeight:active===s.id?"bold":"normal",transition:"all 0.18s",textAlign:"center",lineHeight:1.3}}>
            <div style={{fontSize:"1.25rem"}}>{s.emoji}</div>
            <div>{s.city}</div>
            <div style={{fontSize:"0.72rem",opacity:0.65,marginTop:"2px"}}>{s.dates}</div>
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{maxWidth:"780px",margin:"0 auto",padding:"32px 20px 64px"}}>

        {/* Weather */}
        <WeatherStrip stop={stop} weatherData={weatherData}/>

        {/* Confirmed Bookings */}
        {stop.bookings.length>0&&(
          <div style={{marginBottom:"28px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"6px"}}>
              <div style={{fontWeight:"bold",color:stop.accent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>📋 Confirmed Bookings & Travel</div>
              <div style={{flex:1,height:"1px",background:stop.accent+"30"}}/>
              {hasFlights&&(
                <button onClick={()=>fetchFlightStatuses(setFlightStatus,setFlightLoading,setLastUpdated)} disabled={flightLoading}
                  style={{background:"transparent",border:"1px solid "+stop.accent+"50",borderRadius:"6px",padding:"3px 10px",fontSize:"0.72rem",color:stop.accent,cursor:flightLoading?"default":"pointer",opacity:flightLoading?0.5:1,fontFamily:"Georgia,serif"}}>
                  {flightLoading?"⏳ Checking…":"↻ Refresh"}
                </button>
              )}
            </div>
            {hasFlights&&lastUpdated&&<div style={{fontSize:"0.7rem",color:"#bbb",textAlign:"right",marginBottom:"10px"}}>Last checked: {lastUpdated.toLocaleTimeString()}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {stop.bookings.map((b,i)=><BookingCard key={i} booking={b} accent={stop.accent} flightStatus={flightStatus} flightLoading={flightLoading}/>)}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:"12px",margin:"28px 0 24px"}}>
          <div style={{flex:1,height:"1px",background:"#D4C9B0"}}/>
          <div style={{fontSize:"0.72rem",color:"#bbb",letterSpacing:"0.1em",textTransform:"uppercase"}}>Recommendations</div>
          <div style={{flex:1,height:"1px",background:"#D4C9B0"}}/>
        </div>

        {/* Hotels */}
        <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"24px"}}>
          <HotelCard accent={stop.accent} label="🏠 Jeremy & Jennie's Accommodations" hotel={stop.hotel} hotelAddr={stop.hotelAddr} note={stop.hotelNote}/>
          <HotelCard accent={stop.accent} label="🏠 Stacy, Justin & Ford's Accommodations" hotel={stop.friendHotel} hotelAddr={stop.friendHotelAddr} note={stop.friendHotelNote} secondary/>
        </div>

        {/* Alerts */}
        {stop.alerts.length>0&&<div style={{marginBottom:"24px"}}>{stop.alerts.map((a,i)=><AlertBox key={i} {...a}/>)}</div>}

        {/* Daily Itinerary */}
        <DailyItinerary stop={stop}/>

        {/* Restaurants */}
        <div style={{marginBottom:"28px"}}>
          <SecHead color={stop.accent} label="🍽️ Where to Eat"/>
          <div style={{display:"flex",flexDirection:"column",gap:"11px"}}>
            {stop.restaurants.map((r,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:"10px",padding:"15px 18px",border:"1px solid "+(r.must?stop.accent+"40":"#e0ddd6"),display:"flex",gap:"13px",alignItems:"flex-start",boxShadow:r.must?"0 2px 10px "+stop.accent+"12":"none"}}>
                {r.must
                  ?<div style={{background:stop.accent,color:"#fff",fontSize:"0.58rem",letterSpacing:"0.1em",textTransform:"uppercase",padding:"3px 7px",borderRadius:"4px",whiteSpace:"nowrap",marginTop:"3px",flexShrink:0}}>Must</div>
                  :<div style={{width:"36px",flexShrink:0}}/>
                }
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap",marginBottom:"3px"}}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      style={{fontWeight:"bold",fontSize:"0.98rem",color:"#1a1a1a",textDecoration:"none",borderBottom:"1px solid #ccc"}}>
                      {r.name} ↗
                    </a>
                    <span style={{fontSize:"0.76rem",color:"#999",fontStyle:"italic"}}>{r.type}</span>
                    {r.source==="stacy"&&<span style={{fontSize:"0.6rem",background:"#F3EDF7",color:"#7B4FA6",padding:"1px 7px",borderRadius:"10px",letterSpacing:"0.04em"}}>Stacy's Find</span>}
                    {r.flag&&<span style={{fontSize:"0.6rem",background:"#FFF8E7",color:"#b07010",padding:"1px 7px",borderRadius:"10px",border:"1px solid #E8A02040"}}>⚠ {r.flag}</span>}
                  </div>
                  <div style={{marginBottom:"4px"}}><StarRating rating={r.rating}/></div>
                  <div style={{color:"#555",fontSize:"0.86rem",lineHeight:1.55}}>{r.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div>
          <SecHead color={stop.accent} label="📍 What to Do"/>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {stop.activities.map((a,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:"10px",padding:"14px 18px",border:"1px solid #e0ddd6",display:"flex",gap:"13px",alignItems:"flex-start"}}>
                <div style={{width:"8px",height:"8px",borderRadius:"50%",background:stop.accent,flexShrink:0,marginTop:"7px"}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap",marginBottom:"3px"}}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      style={{fontWeight:"bold",fontSize:"0.94rem",color:"#1a1a1a",textDecoration:"none",borderBottom:"1px solid #ccc"}}>
                      {a.name} ↗
                    </a>
                    {a.source==="stacy"&&<span style={{fontSize:"0.6rem",background:"#F3EDF7",color:"#7B4FA6",padding:"1px 7px",borderRadius:"10px",letterSpacing:"0.04em"}}>Stacy's Find</span>}
                  </div>
                  <div style={{color:"#555",fontSize:"0.86rem",lineHeight:1.55,marginTop:"3px"}}>{a.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{background:"#0D2B3E",color:"#A8C4D4",textAlign:"center",padding:"22px",fontSize:"0.8rem",letterSpacing:"0.05em"}}>
        Maine Coast · May 2026 · 🌊
      </div>
    </div>
  );
}
