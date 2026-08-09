import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { getDatabase, ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyDOLgbNBg3-kIEC4rbO_Cgbrgo55fOQhTM",
    authDomain: "bscs-reviewer-arena.firebaseapp.com",
    databaseURL: "https://bscs-reviewer-arena-default-rtdb.firebaseio.com",
    projectId: "bscs-reviewer-arena",
    storageBucket: "bscs-reviewer-arena.firebasestorage.app",
    messagingSenderId: "992707582654",
    appId: "1:992707582654:web:6c578a8ff50e61eee69cef",
    measurementId: "G-PF14N9BGHY"
  };

  let app;
  let db;

  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("[Arena] Firebase initialized OK.");
  } catch (error) {
    console.error("[Arena] Firebase FAILED to initialize:", error);
  }

  isAnalyticsSupported()
    .then((supported) => {
      if (supported && app) {
        getAnalytics(app);
      }
    })
    .catch((error) => {
      console.warn("[Arena] Analytics not initialized:", error);
    });

  const STORAGE_KEY = "bscs1a_reviewer_arena_scores_v5";
  const FIREBASE_TABLE = "arena_scores";
  /* SECURITY: no hardcoded admin passcode lives in the frontend anymore.
     Score writes go straight to Firebase; write validation (correct data
     shape, no overwriting/deleting other players' entries) is enforced
     server-side by the Firebase Realtime Database Rules instead. */
  const SCORE_PER_CORRECT = 2;
  const STREAK_TARGET = 5;
  const STREAK_BONUS = 1;
  const MAX_LIVES = 3;
  const QUESTION_TIME_LIMIT = 25;
  const WIN_SCORE = 500;
  /* Older deployments of the arena awarded 5 points per correct answer with
     no streak bonus. The current formula awards 2 (+1 every 5-streak), so
     any leaderboard entry saved under the old rules reads roughly 2.5x too
     high. SCORE_MIGRATION_VERSION lets us convert each legacy entry exactly
     once -- entries already tagged with this version (or higher) are left
     untouched on every later load. */
  const SCORE_MIGRATION_VERSION = 2;
  const LEGACY_POINTS_PER_CORRECT = 5;
  const LEGACY_TO_CURRENT_RATIO = SCORE_PER_CORRECT / LEGACY_POINTS_PER_CORRECT;
  const AVATARS = ["\u{1F916}", "\u{1F4BB}", "\u{1F680}", "\u{1F47E}", "\u{1F3AF}", "\u{1F575}\uFE0F\u200D\u2642\uFE0F"];

  const badWords = [
    "fuck", "shit", "bitch", "asshole", "puta", "putangina", "gago", "ulol",
    "tanga", "bobo", "tarantado", "hindot", "leche", "bwisit", "pakyu", "pokpok"
  ];

  // In-game encouragement quotes shown on the game-over screen.
  const motivationalQuotes = [
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
    { text: "Mistakes are proof that you are trying.", author: "" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford" },
    { text: "Consistency is the key. Bawi tayo sa susunod na round, Scholar!", author: "" },
    { text: "Algorithms aren't built in a day. Debug your mistakes and try again!", author: "" }
  ];

  // Cyberpunk / developer greeting quotes shown once in the welcome modal.
  const cyberpunkGreetingQuotes = [
    { text: "Code hard, debug harder, and never let a semicolon decide your fate.", author: "Anonymous Dev" },
    { text: "In a world full of bugs, be the fix.", author: "Anonymous Dev" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Every expert was once a disaster who refused to stop compiling.", author: "Anonymous Dev" },
    { text: "Your future runtime starts with today's commit.", author: "Anonymous Dev" },
    { text: "We are all beta versions of ourselves, pushing updates every day.", author: "Anonymous Dev" },
    { text: "Ctrl+Z doesn't exist in real life, so make every keystroke count.", author: "Anonymous Dev" },
    { text: "The obstacle is just an unhandled exception waiting for your logic.", author: "Anonymous Dev" }
  ];

  const questionBank = [
    { s: "ITEC 101", q: "What does CPU stand for?", choices: ["Central Processing Unit", "Computer Power Utility", "Central Program Upload", "Control Processing User"], answer: "Central Processing Unit" },
    { s: "ITEC 101", q: "Which of the following is an input device?", choices: ["Keyboard", "Monitor", "Speaker", "Projector"], answer: "Keyboard" },
    { s: "ITEC 101", q: "Binary numbers are composed of which digits?", choices: ["0 and 1", "1 and 2", "2 and 3", "0 and 9"], answer: "0 and 1" },
    { s: "ITEC 101", q: "RAM is best described as what type of memory?", choices: ["Temporary memory", "Permanent memory", "Optical memory", "External memory"], answer: "Temporary memory" },
    { s: "ITEC 101", q: "Which device is commonly used for long-term storage?", choices: ["SSD", "RAM", "Cache", "Register"], answer: "SSD" },
    { s: "ITEC 101", q: "What does URL stand for?", choices: ["Uniform Resource Locator", "Universal Routing Link", "Unified Resource Loader", "User Resource Locator"], answer: "Uniform Resource Locator" },
    { s: "ITEC 101", q: "Which is an example of system software?", choices: ["Operating System", "Spreadsheet", "Photo Editor", "Music Player"], answer: "Operating System" },
    { s: "ITEC 101", q: "Processor speed is commonly measured in what unit?", choices: ["GHz", "Volts", "Pixels", "Bytes"], answer: "GHz" },
    { s: "ITEC 101", q: "Which of the following is a web browser?", choices: ["Google Chrome", "Microsoft Word", "Adobe Photoshop", "WinRAR"], answer: "Google Chrome" },
    { s: "ITEC 101", q: "Which network topology uses a central hub or switch?", choices: ["Star", "Bus", "Ring", "Mesh"], answer: "Star" },
    { s: "ITEC 101", q: "What does LAN stand for?", choices: ["Local Area Network", "Large Access Node", "Linked Area Number", "Local Access Network"], answer: "Local Area Network" },
    { s: "ITEC 101", q: "Which memory keeps data even when power is off?", choices: ["ROM", "RAM", "Cache", "Register"], answer: "ROM" },
    { s: "ITEC 101", q: "What is the main purpose of an IP address?", choices: ["To identify a device on a network", "To increase battery life", "To clean a hard drive", "To print documents"], answer: "To identify a device on a network" },
    { s: "ITEC 101", q: "Which of the following is an output device?", choices: ["Monitor", "Scanner", "Keyboard", "Mouse"], answer: "Monitor" },
    { s: "ITEC 101", q: "What does a PSU do in a computer system?", choices: ["Supplies power to components", "Processes data", "Stores files online", "Connects to a projector"], answer: "Supplies power to components" },

    { s: "ITEC 102", q: "What is an algorithm?", choices: ["A step-by-step procedure for solving a problem", "A computer virus", "A hardware upgrade", "A file compression tool"], answer: "A step-by-step procedure for solving a problem" },
    { s: "ITEC 102", q: "What is the purpose of a variable in programming?", choices: ["To store data", "To break the computer", "To connect to Wi-Fi", "To print a paper"], answer: "To store data" },
    { s: "ITEC 102", q: "Which statement is commonly used for decision-making in programs?", choices: ["if", "loop", "print", "scan"], answer: "if" },
    { s: "ITEC 102", q: "What is a loop used for?", choices: ["To repeat a block of code", "To create hardware", "To remove all errors instantly", "To delete memory"], answer: "To repeat a block of code" },
    { s: "ITEC 102", q: "What does debugging mean?", choices: ["Finding and fixing errors", "Deleting all variables", "Installing a browser", "Formatting a drive"], answer: "Finding and fixing errors" },
    { s: "ITEC 102", q: "Which flowchart shape is commonly used for a decision?", choices: ["Diamond", "Circle", "Triangle", "Hexagon"], answer: "Diamond" },
    { s: "ITEC 102", q: "What is an array?", choices: ["A structure that stores multiple values", "A type of printer", "A kind of motherboard", "A video file"], answer: "A structure that stores multiple values" },
    { s: "ITEC 102", q: "A syntax error happens when what occurs?", choices: ["The rules of the programming language are broken", "The internet is slow", "The battery is low", "The keyboard is unplugged"], answer: "The rules of the programming language are broken" },
    { s: "ITEC 102", q: "What is pseudocode?", choices: ["A plain-language way to describe program steps", "An antivirus", "Final machine code", "A spreadsheet formula"], answer: "A plain-language way to describe program steps" },
    { s: "ITEC 102", q: "What does the modulus operator usually return?", choices: ["The remainder", "The average", "The product", "The square root"], answer: "The remainder" },
    { s: "ITEC 102", q: "A Boolean value can be which of the following?", choices: ["True or False", "Blue or Green", "Small or Large", "Odd or Even"], answer: "True or False" },
    { s: "ITEC 102", q: "What is a function in programming?", choices: ["A reusable block of code", "A hardware cable", "A browser tab", "A file extension"], answer: "A reusable block of code" },
    { s: "ITEC 102", q: "What is a parameter?", choices: ["A value accepted by a function", "A type of monitor", "A programming error", "A storage device"], answer: "A value accepted by a function" },
    { s: "ITEC 102", q: "In many programming languages, an array index often starts at what number?", choices: ["0", "1", "2", "10"], answer: "0" },
    { s: "ITEC 102", q: "What is an infinite loop?", choices: ["A loop that never meets its stopping condition", "A loop used only online", "A loop that runs once", "A loop that stores images"], answer: "A loop that never meets its stopping condition" },

    { s: "GEC 101", q: "What does self-concept refer to?", choices: ["A person's perception of themselves", "A person's Wi-Fi settings", "A school schedule", "A computer part"], answer: "A person's perception of themselves" },
    { s: "GEC 101", q: "The physical self mainly refers to what?", choices: ["Body and appearance", "Internet speed", "National budget", "Classroom layout"], answer: "Body and appearance" },
    { s: "GEC 101", q: "The social self develops mainly through what?", choices: ["Interaction with others", "Installing apps", "Writing machine code", "Watching only movies"], answer: "Interaction with others" },
    { s: "GEC 101", q: "What is the digital self?", choices: ["A person's online identity", "A type of keyboard", "A storage file", "A network cable"], answer: "A person's online identity" },
    { s: "GEC 101", q: "Emotional intelligence is the ability to do what?", choices: ["Understand and manage emotions", "Repair a computer", "Memorize every number", "Build a router"], answer: "Understand and manage emotions" },
    { s: "GEC 101", q: "Self-esteem refers to what?", choices: ["A person's sense of self-worth", "A school uniform", "A mobile application", "A typing speed"], answer: "A person's sense of self-worth" },
    { s: "GEC 101", q: "Which statement about development is most accurate?", choices: ["Both nature and nurture influence it", "Only nature matters", "Only nurture matters", "Technology decides everything"], answer: "Both nature and nurture influence it" },
    { s: "GEC 101", q: "What is mindfulness?", choices: ["Awareness of the present moment", "A brand of laptop", "A type of printer", "A programming method"], answer: "Awareness of the present moment" },
    { s: "GEC 101", q: "Values usually guide what?", choices: ["Decisions and behavior", "Battery voltage", "File downloads", "Screen brightness"], answer: "Decisions and behavior" },
    { s: "GEC 101", q: "Johari Window is commonly associated with what?", choices: ["Self-awareness and feedback", "Computer hardware", "Network security", "Sports scoring"], answer: "Self-awareness and feedback" },
    { s: "GEC 101", q: "What is the ideal self?", choices: ["The person one wants to become", "A default profile picture", "A secret password", "A temporary file"], answer: "The person one wants to become" },
    { s: "GEC 101", q: "What is resilience?", choices: ["The ability to recover from challenges", "A software license", "A classroom project", "A phone setting"], answer: "The ability to recover from challenges" },
    { s: "GEC 101", q: "Self-care mainly supports what?", choices: ["Well-being", "Hard drive speed", "Screen resolution", "Signal strength"], answer: "Well-being" },
    { s: "GEC 101", q: "Which is a healthy stress-management technique?", choices: ["Deep breathing", "Ignoring every problem forever", "Skipping all sleep", "Never drinking water"], answer: "Deep breathing" },

    { s: "GEC 102", q: "What is a primary source?", choices: ["Direct firsthand evidence", "A social media post without proof", "Only a summary", "A copied answer sheet"], answer: "Direct firsthand evidence" },
    { s: "GEC 102", q: "Who wrote the Kartilya ng Katipunan?", choices: ["Emilio Jacinto", "Jose Rizal", "Andres Bonifacio", "Apolinario Mabini"], answer: "Emilio Jacinto" },
    { s: "GEC 102", q: "Philippine independence in 1898 was declared in what place?", choices: ["Kawit, Cavite", "Dapitan", "Malolos only", "Intramuros"], answer: "Kawit, Cavite" },
    { s: "GEC 102", q: "Who became the first President of the Philippines?", choices: ["Emilio Aguinaldo", "Jose Rizal", "Andres Bonifacio", "Manuel Quezon"], answer: "Emilio Aguinaldo" },
    { s: "GEC 102", q: "Who arrived in the Philippines in 1521?", choices: ["Ferdinand Magellan", "Miguel Lopez de Legazpi", "Christopher Columbus", "Francisco Dagohoy"], answer: "Ferdinand Magellan" },
    { s: "GEC 102", q: "Who led the Filipinos in the Battle of Mactan?", choices: ["Lapulapu", "Jose Rizal", "Aguinaldo", "Quezon"], answer: "Lapulapu" },
    { s: "GEC 102", q: "What treaty transferred the Philippines from Spain to the United States?", choices: ["Treaty of Paris", "Treaty of Tordesillas", "Biyak-na-Bato Agreement", "Pact of Manila"], answer: "Treaty of Paris" },
    { s: "GEC 102", q: "What is a secondary source?", choices: ["A source that interprets primary sources", "A firsthand diary entry", "An original government record", "A personal letter from the past"], answer: "A source that interprets primary sources" },
    { s: "GEC 102", q: "Historical bias refers to what?", choices: ["A source being influenced by perspective or prejudice", "A source having more pages", "A source being written digitally", "A source being in Filipino"], answer: "A source being influenced by perspective or prejudice" },
    { s: "GEC 102", q: "What is contextualization in history?", choices: ["Placing a source in its proper time and setting", "Destroying a source", "Printing a source", "Changing a source's language"], answer: "Placing a source in its proper time and setting" },
    { s: "GEC 102", q: "The Cry of Pugad Lawin is associated with what?", choices: ["The start of the Philippine Revolution", "The signing of a peace treaty", "A school foundation day", "The opening of a university"], answer: "The start of the Philippine Revolution" },
    { s: "GEC 102", q: "What year is associated with the EDSA People Power Revolution?", choices: ["1986", "1898", "1946", "1972"], answer: "1986" },
    { s: "GEC 102", q: "What is Baybayin?", choices: ["A precolonial writing system", "A type of weapon", "A Spanish ship", "A modern app"], answer: "A precolonial writing system" },
    { s: "GEC 102", q: "History is best described as the study of what?", choices: ["Past events based on evidence and sources", "Only future predictions", "Only myths and legends", "Only computer development"], answer: "Past events based on evidence and sources" },

    { s: "P.I. 100", q: "What is the full name of Rizal?", choices: ["Jose Protacio Rizal Mercado y Alonso Realonda", "Jose Panganiban Rizal Mercado", "Jose Rizal Del Pilar", "Jose Protacio Bonifacio Realonda"], answer: "Jose Protacio Rizal Mercado y Alonso Realonda" },
    { s: "P.I. 100", q: "Who wrote Noli Me Tangere?", choices: ["Jose Rizal", "Andres Bonifacio", "Apolinario Mabini", "Emilio Jacinto"], answer: "Jose Rizal" },
    { s: "P.I. 100", q: "El Filibusterismo is the sequel to what novel?", choices: ["Noli Me Tangere", "Florante at Laura", "Mi Ultimo Adios", "Sa Aking Mga Kabata"], answer: "Noli Me Tangere" },
    { s: "P.I. 100", q: "Where was Jose Rizal born?", choices: ["Calamba, Laguna", "Dapitan, Zamboanga", "Manila", "Kawit, Cavite"], answer: "Calamba, Laguna" },
    { s: "P.I. 100", q: "What date was Rizal born?", choices: ["June 19, 1861", "December 30, 1896", "June 12, 1898", "August 30, 1896"], answer: "June 19, 1861" },
    { s: "P.I. 100", q: "What is the main theme of Noli Me Tangere?", choices: ["Social injustice under Spanish rule", "Space exploration", "Modern web development", "Olympic sports"], answer: "Social injustice under Spanish rule" },
    { s: "P.I. 100", q: "What is the main theme of El Filibusterismo?", choices: ["Revenge and reform", "Plant biology", "Digital marketing", "Volleyball training"], answer: "Revenge and reform" },
    { s: "P.I. 100", q: "Which Rizal poem is often called his farewell masterpiece?", choices: ["Mi Ultimo Adios", "A La Juventud Filipina", "Sa Aking Mga Kabata", "To the Child Jesus"], answer: "Mi Ultimo Adios" },
    { s: "P.I. 100", q: "In what place was Rizal executed?", choices: ["Bagumbayan", "Dapitan", "Fort Santiago", "Biak-na-Bato"], answer: "Bagumbayan" },
    { s: "P.I. 100", q: "What profession is Rizal also known for?", choices: ["Ophthalmologist", "Architect", "Pilot", "Engineer"], answer: "Ophthalmologist" },
    { s: "P.I. 100", q: "What organization did Rizal found in Hong Kong?", choices: ["La Liga Filipina", "Katipunan", "Propaganda Party", "Guardia Civil"], answer: "La Liga Filipina" },
    { s: "P.I. 100", q: "Who among these was Rizal's mother?", choices: ["Teodora Alonso", "Gregoria de Jesus", "Melchora Aquino", "Trinidad Tecson"], answer: "Teodora Alonso" },
    { s: "P.I. 100", q: "Why is Rizal considered a national hero?", choices: ["He inspired reform through his writings and sacrifice", "He invented the internet", "He won many elections", "He discovered electricity"], answer: "He inspired reform through his writings and sacrifice" },
    { s: "P.I. 100", q: "What law requires the study of Rizal in Philippine schools?", choices: ["Rizal Law", "Education Act 2001", "Civil Code", "Barangay Law"], answer: "Rizal Law" },

    { s: "KOMFIL", q: "What does KOMFIL stand for?", choices: ["Kontekstwalisadong Komunikasyon sa Filipino", "Komunikasyon para sa Literatura", "Kompyuter at Filipino", "Konteksto ng Midya at Filipino"], answer: "Kontekstwalisadong Komunikasyon sa Filipino" },
    { s: "KOMFIL", q: "Ano ang pangunahing layunin ng komunikasyon?", choices: ["Magpahayag at magkaunawaan", "Magpalit ng grades", "Mag-compile ng code", "Mag-format ng hard drive"], answer: "Magpahayag at magkaunawaan" },
    { s: "KOMFIL", q: "Ano ang tawag sa taong nagpapadala ng mensahe?", choices: ["Tagapagpadala", "Tagatanggap", "Daluyan", "Simbolo"], answer: "Tagapagpadala" },
    { s: "KOMFIL", q: "Ano ang tawag sa taong tumatanggap ng mensahe?", choices: ["Tagatanggap", "Tagapagpadala", "Ingay", "Paksa"], answer: "Tagatanggap" },
    { s: "KOMFIL", q: "Ano ang channel o daluyan sa komunikasyon?", choices: ["Daan na ginagamit sa pagpapahatid ng mensahe", "Uri ng grado", "Pamagat ng aklat", "Uri ng memorya"], answer: "Daan na ginagamit sa pagpapahatid ng mensahe" },
    { s: "KOMFIL", q: "Ano ang ibig sabihin ng verbal na komunikasyon?", choices: ["Komunikasyong gumagamit ng salita", "Komunikasyong puro larawan lamang", "Komunikasyong walang kahulugan", "Komunikasyong para sa robot lang"], answer: "Komunikasyong gumagamit ng salita" },
    { s: "KOMFIL", q: "Ano ang nonverbal na komunikasyon?", choices: ["Komunikasyong gumagamit ng kilos, galaw, at ekspresyon", "Komunikasyong para sa exams lamang", "Komunikasyong gamit ang printer", "Komunikasyong puro numero"], answer: "Komunikasyong gumagamit ng kilos, galaw, at ekspresyon" },
    { s: "KOMFIL", q: "Ano ang halimbawa ng nonverbal communication?", choices: ["Pagngiti", "Pag-type ng password", "Pag-delete ng file", "Pag-shutdown ng laptop"], answer: "Pagngiti" },
    { s: "KOMFIL", q: "Ano ang tinatawag na sagabal sa malinaw na komunikasyon?", choices: ["Ingay", "Paksa", "Talasalitaan", "Bantas"], answer: "Ingay" },
    { s: "KOMFIL", q: "Ano ang register ng wika?", choices: ["Barayti ng wikang ginagamit ayon sa sitwasyon", "Uri ng camera", "Laki ng silid", "Pangalan ng estudyante"], answer: "Barayti ng wikang ginagamit ayon sa sitwasyon" },
    { s: "KOMFIL", q: "Ano ang akademikong komunikasyon?", choices: ["Pormal na komunikasyong ginagamit sa paaralan at pananaliksik", "Usapang laro lamang", "Usapang meme lang", "Impormal na tsismisan"], answer: "Pormal na komunikasyong ginagamit sa paaralan at pananaliksik" },
    { s: "KOMFIL", q: "Ano ang kahalagahan ng konteksto sa komunikasyon?", choices: ["Nakaaapekto ito sa kahulugan ng mensahe", "Wala itong epekto", "Ginagamit lamang sa coding", "Nagpapabagal ito ng internet"], answer: "Nakaaapekto ito sa kahulugan ng mensahe" },
    { s: "KOMFIL", q: "Ano ang ibig sabihin ng midyum sa komunikasyon?", choices: ["Paraan o anyo ng paghahatid ng mensahe", "Pangkat ng mag-aaral", "Uri ng papel", "Office software"], answer: "Paraan o anyo ng paghahatid ng mensahe" },
    { s: "KOMFIL", q: "Bakit mahalaga ang Filipino sa komunikasyong pambansa?", choices: ["Nagpapalawak ito ng pagkakaunawaan at pambansang identidad", "Pinapalitan nito ang lahat ng wika", "Ginagamit lamang sa social media", "Para lang ito sa elementarya"], answer: "Nagpapalawak ito ng pagkakaunawaan at pambansang identidad" },

    { s: "PATHFIT 1", q: "What does PATHFIT commonly focus on?", choices: ["Physical activity and fitness", "Operating systems", "Film editing", "Bank accounting"], answer: "Physical activity and fitness" },
    { s: "PATHFIT 1", q: "Why is warm-up important before exercise?", choices: ["It prepares the body for movement", "It instantly builds muscles", "It replaces sleep", "It lowers intelligence"], answer: "It prepares the body for movement" },
    { s: "PATHFIT 1", q: "Which of these is a cardiovascular activity?", choices: ["Jogging", "Sleeping", "Reading", "Typing"], answer: "Jogging" },
    { s: "PATHFIT 1", q: "What is flexibility?", choices: ["The ability of joints and muscles to move through a range of motion", "The speed of internet", "The size of a classroom", "The memory of a phone"], answer: "The ability of joints and muscles to move through a range of motion" },
    { s: "PATHFIT 1", q: "Which exercise mainly develops muscular strength?", choices: ["Push-up", "Meditation", "Drawing", "Typing test"], answer: "Push-up" },
    { s: "PATHFIT 1", q: "What should you do after intense exercise?", choices: ["Cool down", "Skip breathing", "Eat paper", "Stay completely still forever"], answer: "Cool down" },
    { s: "PATHFIT 1", q: "Hydration is important because it helps what?", choices: ["Maintain body function during activity", "Increase screen brightness", "Charge batteries", "Improve Wi-Fi"], answer: "Maintain body function during activity" },
    { s: "PATHFIT 1", q: "What is the ideal way to improve endurance?", choices: ["Regular aerobic exercise", "Never moving", "Only watching sports", "Studying only at night"], answer: "Regular aerobic exercise" },
    { s: "PATHFIT 1", q: "Which is an example of a body-weight exercise?", choices: ["Squat", "Printing", "Encoding", "Browsing"], answer: "Squat" },
    { s: "PATHFIT 1", q: "What does BMI stand for?", choices: ["Body Mass Index", "Body Motion Indicator", "Basic Muscle Intake", "Balance Measure Input"], answer: "Body Mass Index" },
    { s: "PATHFIT 1", q: "Why is proper breathing important during workouts?", choices: ["It helps deliver oxygen to the body", "It deletes fatigue forever", "It replaces stretching", "It makes gravity weaker"], answer: "It helps deliver oxygen to the body" },
    { s: "PATHFIT 1", q: "What is one benefit of regular physical activity?", choices: ["Improved health and stamina", "Automatic perfect grades", "Unlimited energy without sleep", "No need for food"], answer: "Improved health and stamina" },
    { s: "PATHFIT 1", q: "Which activity best helps improve balance?", choices: ["Single-leg stand", "Scrolling", "Sleeping", "Watching TV"], answer: "Single-leg stand" },
    { s: "PATHFIT 1", q: "What is the safest mindset during exercise?", choices: ["Practice proper form and listen to your body", "Rush every movement", "Ignore pain", "Compete every second"], answer: "Practice proper form and listen to your body" }
  ];

  const state = {
    username: "",
    avatar: AVATARS[0],
    score: 0,
    lives: MAX_LIVES,
    currentQuestion: null,
    activePool: [],
    currentIndex: 0,
    locked: false,
    streak: 0,
    timer: QUESTION_TIME_LIMIT,
    timerId: null,
    hasUsed5050: false,
    hasUsedSkip: false,
    hiddenChoices: new Set(),
    sessionLocked: false,
    bestScore: 0,
    ending: false,
    allowBlurPenalty: true,
    confettiStopper: null,
    victoryAchieved: false,
    lastEndReason: "",
    mistakes: [],
    displayedScore: 0,
    scoreAnimId: null,
    milestonesHit: new Set()
  };

  // Short terminal-style lines shown on each 25-point milestone overlay.
  const milestoneLines = [
    "SYSTEM CHECKPOINT SAVED",
    "COMPILE SUCCESSFUL",
    "BUFFER UPGRADED",
    "ACHIEVEMENT UNLOCKED",
    "PROCESS BOOSTED",
    "LEVEL UP DETECTED",
    "CACHE OPTIMIZED",
    "PATCH APPLIED"
  ];

  let elements = null;
  let initialized = false;
  let fallbackScores = [];
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 40;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function containsBadWord(text) {
    const lowered = text.toLowerCase();
    return badWords.some((word) => lowered.includes(word));
  }

  function sanitizeUsername(raw) {
    return raw.replace(/[<>]/g, "").trim().slice(0, 22);
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getRandomQuote() {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  }

  function formatQuote(quote) {
    return quote.author ? `"${quote.text}" \u2014 ${quote.author}` : `"${quote.text}"`;
  }

  function getRank(score) {
    if (score >= WIN_SCORE) return "Academic Overlord";
    if (score >= 300) return "Systems Architect";
    if (score >= 200) return "Senior Debugger";
    if (score >= 120) return "Code Specialist";
    if (score >= 60) return "Junior Scholar";
    if (score >= 20) return "Warrior Fresh";
    return "Rookie Freshman";
  }

  /* ---------------- Bind helper: click + touch without double-fire ---------------- */
  function bindTap(el, handler) {
    if (!el) return;
    let touched = false;
    el.addEventListener(
      "touchend",
      (event) => {
        touched = true;
        handler(event);
        window.setTimeout(() => { touched = false; }, 400);
      },
      { passive: false }
    );
    el.addEventListener("click", (event) => {
      if (touched) return;
      handler(event);
    });
  }

  /* ---------------- Welcome modal ---------------- */
  function initWelcomeModal() {
    const modal = $("welcomeModal");
    const quoteEl = $("welcomeQuote");
    const enterBtn = $("welcomeEnterBtn");
    if (!modal || !quoteEl || !enterBtn) return;

    const quote = cyberpunkGreetingQuotes[Math.floor(Math.random() * cyberpunkGreetingQuotes.length)];
    quoteEl.textContent = quote.text;

    const dismiss = () => {
      modal.setAttribute("hidden", "hidden");
      document.body.classList.remove("no-scroll");
    };

    document.body.classList.add("no-scroll");
    bindTap(enterBtn, (event) => {
      event.preventDefault();
      dismiss();
    });
  }

  /* ---------------- Generic on-demand pop-up modals ---------------- */
  /* Powers the "View Game Protocol" and "View Leaderboard" buttons: any
     element with [data-open-modal="someId"] opens #someId, and any element
     with [data-close-modal="someId"] (or the generic .modal-close-btn)
     closes it. Both modals default to hidden and only ever appear as a
     clean pop-up on top of everything -- never inline in the page flow. */
  function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.removeAttribute("hidden");
    document.body.classList.add("no-scroll");
    if (id === "leaderboardModal") {
      renderLeaderboard();
    }
  }

  function closeModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.setAttribute("hidden", "hidden");
    document.body.classList.remove("no-scroll");
  }

  function initModalTriggers() {
    document.querySelectorAll("[data-open-modal]").forEach((btn) => {
      bindTap(btn, (event) => {
        event.preventDefault();
        openModal(btn.getAttribute("data-open-modal"));
      });
    });
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      bindTap(btn, (event) => {
        event.preventDefault();
        closeModal(btn.getAttribute("data-close-modal"));
      });
    });
  }

  /* ---------------- Binary matrix ambient background ---------------- */
  function initMatrixBackground() {
    const host = $("matrixBg");
    if (!host) return;
    const colCount = Math.max(10, Math.floor(window.innerWidth / 26));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < colCount; i += 1) {
      const col = document.createElement("div");
      col.className = "matrix-col";
      col.style.left = `${(i / colCount) * 100}%`;
      col.style.animationDuration = `${8 + Math.random() * 10}s`;
      col.style.animationDelay = `${Math.random() * -12}s`;
      let stream = "";
      const rows = 40 + Math.floor(Math.random() * 30);
      for (let r = 0; r < rows; r += 1) {
        stream += Math.round(Math.random()) + "\n";
      }
      col.textContent = stream;
      frag.appendChild(col);
    }
    host.appendChild(frag);
  }

  /* ---------------- Mobile nav + smooth scroll ---------------- */
  function initNav() {
    const toggle = $("navToggle");
    const links = $("navLinks");
    if (toggle && links) {
      bindTap(toggle, (event) => {
        event.preventDefault();
        const open = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    document.querySelectorAll(".js-smooth, .nav-links a").forEach((a) => {
      a.addEventListener("click", (event) => {
        const href = a.getAttribute("href") || "";
        if (!href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        if (links) {
          links.classList.remove("open");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
        history.replaceState(null, "", href);
      });
    });
  }

  /* ---------------- Avatar picker ---------------- */
  function initAvatarGrid() {
    const grid = $("avatarGrid");
    if (!grid) return;
    grid.innerHTML = "";
    AVATARS.forEach((emoji, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "avatar-opt" + (index === 0 ? " selected" : "");
      btn.textContent = emoji;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", index === 0 ? "true" : "false");
      bindTap(btn, (event) => {
        event.preventDefault();
        grid.querySelectorAll(".avatar-opt").forEach((el) => {
          el.classList.remove("selected");
          el.setAttribute("aria-checked", "false");
        });
        btn.classList.add("selected");
        btn.setAttribute("aria-checked", "true");
        state.avatar = emoji;
      });
      grid.appendChild(btn);
    });
    state.avatar = AVATARS[0];
  }

  function init() {
    if (initialized) return;

    elements = {
      loginView: $("loginView"),
      gameView: $("gameView"),
      gameOverView: $("gameOverView"),
      usernameInput: $("usernameInput"),
      startBtn: $("startBtn"),
      restartBtn: $("restartBtn"),
      loginStatus: $("loginStatus"),
      hudUser: $("hudUser"),
      hudRank: $("hudRank"),
      hudScore: $("hudScore"),
      hudLives: $("hudLives"),
      subjectChip: $("subjectChip"),
      questionText: $("questionText"),
      choicesWrap: $("choicesWrap"),
      feedback: $("feedback"),
      leaderboardBody: $("leaderboardBody"),
      finalScore: $("finalScore"),
      finalRank: $("finalRank"),
      timerBarFill: $("timerBarFill"),
      timerNum: $("timerNum"),
      lifelineRow: $("lifelineRow"),
      gameOverNote: $("gameOverNote"),
      gameOverQuote: $("gameOverQuote"),
      reviewList: $("reviewList"),
      lbTitle: $("lbTitle")
    };

    const missing = Object.keys(elements).filter((key) => !elements[key]);
    if (missing.length) {
      initAttempts += 1;
      if (initAttempts === 1) {
        console.warn("[Arena] Waiting for DOM elements, missing so far:", missing);
      }
      if (initAttempts >= MAX_INIT_ATTEMPTS) {
        console.error("[Arena] Giving up: these element IDs were never found in the HTML:", missing);
        return;
      }
      setTimeout(init, 300);
      return;
    }

    initWelcomeModal();
    initMatrixBackground();
    initNav();
    initAvatarGrid();
    initLifelineButtons();
    initAdminTrigger();

    bindTap(elements.startBtn, (event) => {
      event.preventDefault();
      startGame();
    });

    bindTap(elements.restartBtn, (event) => {
      event.preventDefault();
      rebootArena();
    });

    initModalTriggers();

    elements.usernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        startGame();
      }
    });

    document.addEventListener("keydown", handleGlobalKeys);
    window.addEventListener("blur", handleWindowBlur);

    migrateLegacyScores().then(() => renderLeaderboard());
    updateHud();
    setView("loginView");
    initialized = true;
    console.log("[Arena] Game initialized OK.");
  }

  /* ---------------- Lifelines ---------------- */
  function initLifelineButtons() {
    const row = elements.lifelineRow;
    row.innerHTML = "";

    const fiftyBtn = document.createElement("button");
    fiftyBtn.type = "button";
    fiftyBtn.id = "lifeline5050";
    fiftyBtn.className = "lifeline-btn";
    fiftyBtn.textContent = "50/50";
    bindTap(fiftyBtn, (event) => {
      event.preventDefault();
      useFiftyFifty();
    });

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.id = "lifelineSkip";
    skipBtn.className = "lifeline-btn";
    skipBtn.textContent = "Skip Question";
    bindTap(skipBtn, (event) => {
      event.preventDefault();
      useSkip();
    });

    row.appendChild(fiftyBtn);
    row.appendChild(skipBtn);
    elements.fiftyBtn = fiftyBtn;
    elements.skipBtn = skipBtn;
  }

  function useFiftyFifty() {
    if (state.locked || state.hasUsed5050 || !state.currentQuestion) return;
    state.hasUsed5050 = true;
    elements.fiftyBtn.disabled = true;

    const wrongOnes = state.currentQuestion.choices.filter((c) => c !== state.currentQuestion.answer);
    const toHide = shuffle(wrongOnes).slice(0, 2);
    toHide.forEach((choice) => state.hiddenChoices.add(choice));
    renderChoiceButtons();
  }

  function useSkip() {
    if (state.locked || state.hasUsedSkip || !state.currentQuestion) return;
    state.hasUsedSkip = true;
    elements.skipBtn.disabled = true;
    elements.feedback.textContent = "Skipped. Walang penalty.";
    elements.feedback.className = "feedback";
    stopTimer();
    window.setTimeout(loadNextQuestion, 350);
  }

  /* ---------------- View + HUD ---------------- */
  function setView(name) {
    [elements.loginView, elements.gameView, elements.gameOverView].forEach((view) => {
      view.classList.remove("active");
    });
    const map = { loginView: elements.loginView, gameView: elements.gameView, gameOverView: elements.gameOverView };
    map[name].classList.add("active");

    if (name === "gameView") {
      document.body.classList.add("arena-playing");
      document.body.classList.remove("arena-gameover");
    } else if (name === "gameOverView") {
      document.body.classList.add("arena-gameover");
      document.body.classList.remove("arena-playing", "streak-hot");
      // Mobile UX fix: auto-focus/scroll straight to the crash panel so the
      // player never has to manually scroll down to see their result.
      window.requestAnimationFrame(() => {
        elements.gameOverView.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      document.body.classList.remove("arena-playing", "arena-gameover", "streak-hot");
    }
  }

  function animateScoreTo(target) {
    if (state.scoreAnimId) cancelAnimationFrame(state.scoreAnimId);
    const start = state.displayedScore;
    const diff = target - start;
    const duration = 420;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      state.displayedScore = Math.round(start + diff * eased);
      elements.hudScore.textContent = String(state.displayedScore);
      if (progress < 1) {
        state.scoreAnimId = requestAnimationFrame(step);
      } else {
        state.displayedScore = target;
        elements.hudScore.textContent = String(target);
      }
    }
    state.scoreAnimId = requestAnimationFrame(step);
  }

  function updateHud() {
    elements.hudUser.textContent = state.username
      ? `${state.avatar} ${state.username}`
      : "-";
    elements.hudRank.textContent = getRank(state.score);
    animateScoreTo(state.score);
    elements.hudLives.textContent = "\u2764\uFE0F".repeat(Math.max(0, state.lives)) +
      "\u{1F5A4}".repeat(Math.max(0, MAX_LIVES - state.lives));

    document.body.classList.toggle("streak-hot", state.streak >= STREAK_TARGET && !state.ending);
  }

  /* ---------------- Timer ---------------- */
  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    state.timer = QUESTION_TIME_LIMIT;
    renderTimerBar();

    state.timerId = setInterval(() => {
      state.timer -= 1;
      renderTimerBar();
      if (state.timer <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }

  function renderTimerBar() {
    const pct = Math.max(0, (state.timer / QUESTION_TIME_LIMIT) * 100);
    elements.timerBarFill.style.width = `${pct}%`;
    elements.timerNum.textContent = String(Math.max(0, state.timer));

    let color = "#64ffda";
    if (pct <= 60 && pct > 30) color = "#ffe066";
    if (pct <= 30) color = "#ff6b6b";
    elements.timerBarFill.style.background = color;
  }

  function handleTimeout() {
    if (state.locked || !state.currentQuestion) return;
    state.mistakes.push({
      subject: state.currentQuestion.s,
      q: state.currentQuestion.q,
      chosen: "(Walang sagot \u2014 naubos ang oras)",
      correct: state.currentQuestion.answer
    });
    disableChoices(state.currentQuestion.answer);
    state.streak = 0;
    loseLife("timeout");
  }

  /* ---------------- Question flow ---------------- */
  function buildPool() {
    state.activePool = shuffle(questionBank);
    state.currentIndex = 0;
  }

  function loadNextQuestion() {
    if (state.ending || state.sessionLocked) return;

    if (state.currentIndex >= state.activePool.length) {
      buildPool();
    }

    const question = state.activePool[state.currentIndex];
    state.currentIndex += 1;
    state.currentQuestion = question;
    state.locked = false;
    state.hiddenChoices = new Set();
    state.hasUsed5050 = false;
    state.hasUsedSkip = false;
    if (elements.fiftyBtn) elements.fiftyBtn.disabled = false;
    if (elements.skipBtn) elements.skipBtn.disabled = false;

    elements.subjectChip.textContent = question.s;
    elements.questionText.textContent = question.q;
    elements.feedback.textContent = "";
    elements.feedback.className = "feedback";

    renderChoiceButtons();
    startTimer();
  }

  function renderChoiceButtons() {
    const question = state.currentQuestion;
    elements.choicesWrap.innerHTML = "";
    const options = shuffle(question.choices);

    options.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = choice;

      if (state.hiddenChoices.has(choice)) {
        btn.style.visibility = "hidden";
        btn.disabled = true;
      }

      bindTap(btn, (event) => {
        event.preventDefault();
        handleAnswer(choice, btn);
      });

      elements.choicesWrap.appendChild(btn);
    });
  }

  function disableChoices(correctAnswer) {
    const buttons = elements.choicesWrap.querySelectorAll(".choice");
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.textContent === correctAnswer) {
        btn.classList.add("correct");
      }
    });
  }

  function handleAnswer(choice, btnEl) {
    if (state.locked || !state.currentQuestion) return;
    state.locked = true;
    stopTimer();

    const correct = choice === state.currentQuestion.answer;
    const buttons = elements.choicesWrap.querySelectorAll(".choice");

    buttons.forEach((btn) => { btn.disabled = true; });

    if (correct) {
      btnEl.classList.add("correct");
      state.streak += 1;
      let gained = SCORE_PER_CORRECT;
      if (state.streak > 0 && state.streak % STREAK_TARGET === 0) {
        gained += STREAK_BONUS;
      }
      const oldScore = state.score;
      state.score += gained;
      elements.feedback.textContent = `Correct! +${gained} points \u00b7 Streak ${state.streak}`;
      elements.feedback.className = "feedback";
      updateHud();

      if (state.score >= WIN_SCORE && !state.victoryAchieved) {
        handleGraduationWin();
        return;
      }

      const milestone = getCrossedMilestone(oldScore, state.score);
      if (milestone) {
        state.milestonesHit.add(milestone);
        state.lives += 2;
        updateHud();
        stopTimer();
        showMilestoneOverlay(milestone, () => {
          window.setTimeout(loadNextQuestion, 250);
        });
        return;
      }

      window.setTimeout(loadNextQuestion, 550);
    } else {
      btnEl.classList.add("wrong");
      buttons.forEach((btn) => {
        if (btn.textContent === state.currentQuestion.answer) btn.classList.add("correct");
      });
      state.mistakes.push({
        subject: state.currentQuestion.s,
        q: state.currentQuestion.q,
        chosen: choice,
        correct: state.currentQuestion.answer
      });
      state.streak = 0;
      elements.feedback.textContent = "Mali. Isang heart ang nabawas.";
      elements.feedback.className = "feedback is-wrong";
      updateHud();
      loseLife("wrong");
    }
  }

  function loseLife(reason) {
    state.lives -= 1;
    updateHud();
    if (state.lives <= 0) {
      window.setTimeout(() => endGame(reason), 500);
    } else {
      window.setTimeout(loadNextQuestion, 650);
    }
  }

  /* ---------------- 25-point milestones ---------------- */
  function getCrossedMilestone(oldScore, newScore) {
    const milestone = Math.floor(newScore / 25) * 25;
    if (milestone > 0 && milestone < WIN_SCORE && milestone > oldScore && !state.milestonesHit.has(milestone)) {
      return milestone;
    }
    return null;
  }

  function showMilestoneOverlay(milestone, onDone) {
    const overlay = document.createElement("div");
    overlay.className = "milestone-overlay";
    const line = milestoneLines[Math.floor(Math.random() * milestoneLines.length)];
    overlay.innerHTML =
      '<div class="milestone-box">' +
        '<p class="milestone-tag">[CHECKPOINT :: SCORE ' + milestone + ']</p>' +
        '<p class="milestone-line">' + escapeHtml(line) + '</p>' +
        '<p class="milestone-reward">+2 \u2764\uFE0F HEARTS AWARDED</p>' +
      '</div>';
    document.body.appendChild(overlay);

    window.setTimeout(() => {
      overlay.classList.add("fade-out");
      window.setTimeout(() => {
        overlay.remove();
        if (typeof onDone === "function") onDone();
      }, 260);
    }, 1200);
  }

  /* ---------------- Blur / focus anti-cheat ---------------- */
  function handleWindowBlur() {
    if (!state.allowBlurPenalty) return;
    if (elements.gameView.classList.contains("active") && !state.locked && !state.ending) {
      endGame("blur");
    }
  }

  function handleGlobalKeys(event) {
    if (event.key === "Escape") {
      const overlay = document.querySelector(".admin-overlay");
      if (overlay) overlay.remove();
    }
  }

  /* ---------------- Start / reboot ---------------- */
  function resetArena() {
    state.score = 0;
    state.lives = MAX_LIVES;
    state.currentQuestion = null;
    state.currentIndex = 0;
    state.locked = false;
    state.streak = 0;
    state.hasUsed5050 = false;
    state.hasUsedSkip = false;
    state.hiddenChoices = new Set();
    state.ending = false;
    state.victoryAchieved = false;
    state.mistakes = [];
    state.displayedScore = 0;
    state.milestonesHit = new Set();
    buildPool();
    updateHud();
  }

  function startGame() {
    if (state.sessionLocked) return;
    const raw = elements.usernameInput.value || "";
    const cleaned = sanitizeUsername(raw);

    if (!cleaned) {
      elements.loginStatus.textContent = "Kailangan ng username bago simulan ang challenge.";
      return;
    }
    if (containsBadWord(cleaned)) {
      elements.loginStatus.textContent = "Gumamit ng angkop na username, walang bastos na salita.";
      return;
    }

    state.username = cleaned;
    resetArena();
    updateHud();
    setView("gameView");
    loadNextQuestion();
  }

  function rebootArena() {
    if (state.sessionLocked) {
      window.location.reload();
      return;
    }
    stopTimer();
    elements.usernameInput.value = "";
    state.username = "";
    state.bestScore = 0;
    resetArena();
    elements.loginStatus.textContent = "Enter your username to begin the reviewer challenge.";
    setView("loginView");
    elements.usernameInput.focus();
  }

  /* ---------------- Leaderboard (Firebase + local fallback) ---------------- */
  async function fetchScores() {
    if (db) {
      try {
        const snap = await get(ref(db, FIREBASE_TABLE));
        if (snap.exists()) {
          const val = snap.val();
          return Object.keys(val).map((key) => ({ id: key, ...val[key] }));
        }
        return [];
      } catch (error) {
        console.warn("[Arena] Firebase read failed, using local cache:", error);
      }
    }
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return fallbackScores;
    }
  }

  async function persistScores(list) {
    fallbackScores = list;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      console.warn("[Arena] localStorage write failed:", error);
    }
  }

  /* ---------------- One-time legacy score conversion ---------------- */
  async function migrateLegacyScores() {
    let all;
    try {
      all = await fetchScores();
    } catch (error) {
      console.warn("[Arena] Could not load scores for migration:", error);
      return;
    }
    if (!all.length) return;

    const legacyEntries = all.filter(
      (entry) => !entry.scoreVersion || entry.scoreVersion < SCORE_MIGRATION_VERSION
    );
    if (!legacyEntries.length) return;

    const migrated = all.map((entry) => {
      if (entry.scoreVersion && entry.scoreVersion >= SCORE_MIGRATION_VERSION) return entry;
      const oldScore = Number(entry.score || 0);
      const newScore = Math.max(0, Math.round(oldScore * LEGACY_TO_CURRENT_RATIO));
      return {
        ...entry,
        score: newScore,
        badge: getRank(newScore),
        scoreVersion: SCORE_MIGRATION_VERSION
      };
    });

    if (db) {
      try {
        await Promise.all(
          migrated
            .filter((entry) => entry.id)
            .map((entry) => {
              const { id, ...rest } = entry;
              return set(ref(db, `${FIREBASE_TABLE}/${id}`), rest);
            })
        );
      } catch (error) {
        console.warn("[Arena] Firebase score migration failed, keeping local cache only:", error);
      }
    }

    await persistScores(migrated);
    console.log(`[Arena] Migrated ${legacyEntries.length} legacy score(s) to the current formula.`);
  }

  async function saveScore() {
    const entry = {
      username: state.username,
      score: state.score,
      badge: getRank(state.score),
      avatar: state.avatar,
      ts: Date.now(),
      scoreVersion: SCORE_MIGRATION_VERSION
    };

    if (db) {
      try {
        const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await set(ref(db, `${FIREBASE_TABLE}/${key}`), entry);
        return;
      } catch (error) {
        console.warn("[Arena] Firebase write failed, saving locally instead:", error);
      }
    }

    const list = await fetchScores();
    list.push(entry);
    await persistScores(list);
  }

  function medalFor(rankIndex) {
    if (rankIndex === 0) return { medal: "\u{1F947}", cls: "row-gold" };
    if (rankIndex === 1) return { medal: "\u{1F948}", cls: "row-silver" };
    if (rankIndex === 2) return { medal: "\u{1F949}", cls: "row-bronze" };
    return { medal: "", cls: "" };
  }

  async function renderLeaderboard() {
    const all = await fetchScores();
    const top = all
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    if (!top.length) {
      elements.leaderboardBody.innerHTML = `<tr><td colspan="4" class="lb-empty">No challenger records yet.</td></tr>`;
      return;
    }

    elements.leaderboardBody.innerHTML = top
      .map((entry, index) => {
        const { medal, cls } = medalFor(index);
        const avatar = entry.avatar ? `<span class="lb-avatar">${escapeHtml(entry.avatar)}</span>` : "";
        return `<tr class="${cls}">
          <td><span class="lb-rank">${medal ? `<span class="lb-medal">${medal}</span>` : ""}${index + 1}</span></td>
          <td>${avatar}${escapeHtml(entry.username || "Anonymous")}</td>
          <td>${escapeHtml(entry.badge || getRank(entry.score || 0))}</td>
          <td>${Number(entry.score || 0)}</td>
        </tr>`;
      })
      .join("");
  }

  /* ---------------- Leaderboard admin: edit / recalc / reset ---------------- */
  function initAdminTrigger() {
    const title = elements.lbTitle;
    if (!title) return;
    let taps = 0;
    let tapTimer = null;

    bindTap(title, (event) => {
      event.preventDefault();
      taps += 1;
      if (tapTimer) clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => { taps = 0; }, 1600);
      if (taps >= 5) {
        taps = 0;
        openAdminGate();
      }
    });
  }

  function openAdminGate() {
    /* SECURITY: the frontend passcode gate is gone. The panel can open,
       but Firebase Rules now reject any attempt (from here or anywhere
       else) to overwrite or delete an existing leaderboard entry, so
       there is no real admin power left to protect client-side. */
    openAdminPanel();
  }

  async function openAdminPanel() {
    const existing = document.querySelector(".admin-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "admin-overlay";

    const panel = document.createElement("div");
    panel.className = "admin-panel";
    panel.innerHTML = `<h3 style="margin:0 0 10px;font-size:1rem;">Leaderboard Admin</h3>
      <p style="margin:0 0 10px;font-size:0.78rem;color:var(--muted);">
        I-edit ang score para ma-recalculate ang rank sa bagong 25-second mechanics, o i-delete ang isang entry.
        Hindi nasisira ang Firebase structure &mdash; nag-a-update lang ito ng existing records.
      </p>
      <div id="adminRows"></div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="button" class="lifeline-btn" id="adminClose">Close</button>
        <button type="button" class="lifeline-btn admin-danger" id="adminResetAll">Reset ALL Scores</button>
      </div>`;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const rowsHost = panel.querySelector("#adminRows");
    const all = await fetchScores();
    const sorted = all.slice().sort((a, b) => (b.score || 0) - (a.score || 0));

    if (!sorted.length) {
      rowsHost.innerHTML = `<p class="lb-empty">Walang records.</p>`;
    } else {
      sorted.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "admin-row";
        row.innerHTML = `<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(entry.avatar || "")} ${escapeHtml(entry.username || "Anonymous")}</span>
          <input type="number" value="${Number(entry.score || 0)}" />
          <button type="button" class="admin-save">Save</button>
          <button type="button" class="admin-danger admin-delete">Del</button>`;

        const input = row.querySelector("input");
        const saveBtn = row.querySelector(".admin-save");
        const delBtn = row.querySelector(".admin-delete");

        bindTap(saveBtn, async (event) => {
          event.preventDefault();
          const newScore = Math.max(0, parseInt(input.value, 10) || 0);
          entry.score = newScore;
          entry.badge = getRank(newScore);
          entry.scoreVersion = SCORE_MIGRATION_VERSION;
          await writeEntry(entry);
          await renderLeaderboard();
          saveBtn.textContent = "Saved";
          window.setTimeout(() => { saveBtn.textContent = "Save"; }, 900);
        });

        bindTap(delBtn, async (event) => {
          event.preventDefault();
          if (!window.confirm(`Alisin ang record ni ${entry.username}?`)) return;
          await deleteEntry(entry);
          row.remove();
          await renderLeaderboard();
        });

        rowsHost.appendChild(row);
      });
    }

    bindTap(panel.querySelector("#adminClose"), (event) => {
      event.preventDefault();
      overlay.remove();
    });

    bindTap(panel.querySelector("#adminResetAll"), async (event) => {
      event.preventDefault();
      if (!window.confirm("Sigurado ka bang gusto mong i-reset ang LAHAT ng scores? Hindi na ito maibabalik.")) return;
      await resetAllScores();
      overlay.remove();
      await renderLeaderboard();
    });

    bindTap(overlay, (event) => {
      if (event.target === overlay) overlay.remove();
    });
  }

  async function writeEntry(entry) {
    if (db && entry.id) {
      try {
        await set(ref(db, `${FIREBASE_TABLE}/${entry.id}`), {
          username: entry.username,
          score: entry.score,
          badge: entry.badge,
          avatar: entry.avatar || "",
          ts: entry.ts || Date.now(),
          scoreVersion: entry.scoreVersion || SCORE_MIGRATION_VERSION
        });
        return;
      } catch (error) {
        console.warn("[Arena] Firebase edit failed, falling back to local:", error);
      }
    }
    const list = await fetchScores();
    const idx = list.findIndex((item) => item === entry || (item.username === entry.username && item.ts === entry.ts));
    if (idx >= 0) list[idx] = entry;
    await persistScores(list);
  }

  async function deleteEntry(entry) {
    if (db && entry.id) {
      try {
        await remove(ref(db, `${FIREBASE_TABLE}/${entry.id}`));
        return;
      } catch (error) {
        console.warn("[Arena] Firebase delete failed, falling back to local:", error);
      }
    }
    const list = await fetchScores();
    const filtered = list.filter((item) => item !== entry && !(item.username === entry.username && item.ts === entry.ts));
    await persistScores(filtered);
  }

  async function resetAllScores() {
    if (db) {
      try {
        await remove(ref(db, FIREBASE_TABLE));
      } catch (error) {
        console.warn("[Arena] Firebase reset failed, clearing local cache instead:", error);
      }
    }
    await persistScores([]);
  }

  /* ---------------- Confetti ---------------- */
  function startConfettiEffect() {
    const canvas = $("confettiCanvas");
    if (!canvas) return () => {};
    canvas.hidden = false;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const colors = ["#64ffda", "#00e5ff", "#ffd27d", "#ff6b6b", "#eaf5ff"];
    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height,
      r: 4 + Math.random() * 5,
      c: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.1 + Math.random() * 0.2
    }));

    let running = true;
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > canvas.height + 20) p.y = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      requestAnimationFrame(tick);
    }
    tick();

    return () => {
      running = false;
      canvas.hidden = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  function playVictoryFanfare() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.value = 0.06;
        osc.connect(gain).connect(ctx.destination);
        const startAt = ctx.currentTime + i * 0.15;
        osc.start(startAt);
        osc.stop(startAt + 0.18);
      });
    } catch (error) {
      console.warn("[Arena] Audio fanfare skipped:", error);
    }
  }

  /* ---------------- Overlay helper for graduation / session lock ---------------- */
  function createOverlayShell() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const panel = document.createElement("div");
    panel.className = "modal-panel";
    panel.style.textAlign = "left";
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    return { overlay, panel };
  }

  function showGraduationModal() {
    return new Promise((resolve) => {
      const { overlay, panel } = createOverlayShell();
      panel.style.textAlign = "center";
      panel.innerHTML =
        "<h2 style='margin:0 0 12px;font-size:1.5rem;'>\u{1F393} CONGRATULATIONS, GRADUATE! \u{1F393}</h2>" +
        "<p style='line-height:1.7;margin:0 0 10px;font-size:0.9rem;color:rgba(230,241,255,0.88);'>You have officially conquered the BSCS 1-A Academic Reviewer Arena with a Perfect Master Score of 500+! You are now certified as the ultimate <strong>Academic Overlord</strong> of the section. Good luck on your actual exams, Scholar!</p>" +
        "<p style='margin:0 0 8px;'><strong>Final Score:</strong> " + state.score + "</p>" +
        "<p style='margin:0 0 18px;'><strong>Rank:</strong> " + escapeHtml(getRank(state.score)) + "</p>";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "modal-enter";
      button.textContent = "Close Graduation Modal";

      bindTap(button, (event) => {
        event.preventDefault();
        overlay.remove();
        resolve();
      });

      panel.appendChild(button);
    });
  }

  function showSessionLockScreen() {
    const { panel } = createOverlayShell();
    panel.innerHTML =
      "<h2 style='margin:0 0 12px;font-size:1.3rem;'>Session Locked</h2>" +
      "<p style='line-height:1.7;margin:0 0 16px;font-size:0.88rem;color:rgba(230,241,255,0.88);'>Na-save na ang iyong graduation score sa cloud. Para maiwasan ang abuse, naka-lock na ang current session. I-reload ang page para sa bagong arena run.</p>";

    const reloadButton = document.createElement("button");
    reloadButton.type = "button";
    reloadButton.className = "modal-enter";
    reloadButton.textContent = "Reload Page";
    bindTap(reloadButton, (event) => {
      event.preventDefault();
      window.location.reload();
    });
    panel.appendChild(reloadButton);
  }

  async function handleGraduationWin() {
    if (state.ending) return;
    state.ending = true;
    state.victoryAchieved = true;
    state.locked = true;
    state.allowBlurPenalty = false;
    stopTimer();

    if (state.currentQuestion) {
      disableChoices(state.currentQuestion.answer);
    }

    updateHud();
    state.confettiStopper = startConfettiEffect();
    playVictoryFanfare();

    await saveScore();
    await renderLeaderboard();
    elements.finalScore.textContent = String(state.score);
    elements.finalRank.textContent = getRank(state.score);

    await showGraduationModal();

    if (typeof state.confettiStopper === "function") {
      state.confettiStopper();
      state.confettiStopper = null;
    }

    state.sessionLocked = true;
    setView("loginView");
    elements.startBtn.disabled = true;
    elements.usernameInput.disabled = true;
    elements.loginStatus.textContent = "Graduation complete. Session locked to prevent score abuse.";
    showSessionLockScreen();
  }

  function renderReviewPanel() {
    if (!state.mistakes.length) {
      elements.reviewList.innerHTML = `<p class="review-empty">Walang mistakes this run &mdash; perfect recall!</p>`;
      return;
    }
    elements.reviewList.innerHTML = state.mistakes
      .map((m) => `<div class="review-item">
          <span class="rq">[${escapeHtml(m.subject)}] ${escapeHtml(m.q)}</span>
          <span class="ra">Sagot mo: ${escapeHtml(m.chosen)}</span>
          <span class="ra">Tamang sagot: <b>${escapeHtml(m.correct)}</b></span>
        </div>`)
      .join("");
  }

  function updateGameOverDisplay(reason) {
    const quote = getRandomQuote();
    const messageMap = {
      lives: "Naubos ang hearts mo sa arena. Regroup, review, then bounce back.",
      wrong: "That final mistake ended the run, pero kaya mo pang higitan ito.",
      timeout: "Naubos ang oras sa huling tanong mo. Bilisan ang recall sa next round.",
      blur: "Auto game over ito dahil lumipat ka ng browser tab habang active ang game."
    };

    elements.gameOverNote.innerHTML = "<strong>Status:</strong> " + escapeHtml(messageMap[reason] || messageMap.lives);
    elements.gameOverQuote.textContent = formatQuote(quote);
    renderReviewPanel();
  }

  async function endGame(reason = "lives") {
    if (state.ending) return;
    state.ending = true;
    state.locked = true;
    state.lastEndReason = reason;
    stopTimer();
    state.allowBlurPenalty = false;

    await saveScore();
    await renderLeaderboard();

    elements.finalScore.textContent = String(state.score);
    elements.finalRank.textContent = getRank(state.score);
    updateGameOverDisplay(reason);
    setView("gameOverView");

    state.allowBlurPenalty = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
