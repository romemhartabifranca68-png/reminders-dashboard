import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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

  const STORAGE_KEY = "bscs1a_reviewer_arena_scores_v4";
  const FIREBASE_TABLE = "arena_scores";
  const SCORE_PER_CORRECT = 2;
  const STREAK_TARGET = 5;
  const STREAK_BONUS = 1;
  const MAX_LIVES = 3;
  const QUESTION_TIME_LIMIT = 15;
  const WIN_SCORE = 500;

  const badWords = [
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "puta",
    "putangina",
    "gago",
    "ulol",
    "tanga",
    "bobo",
    "tarantado",
    "hindot",
    "leche",
    "bwisit",
    "pakyu",
    "pokpok"
  ];

  const motivationalQuotes = [
    {
      text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      author: "Winston Churchill"
    },
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    {
      text: "Don't let what you cannot do interfere with what you can do.",
      author: "John Wooden"
    },
    { text: "Mistakes are proof that you are trying.", author: "" },
    {
      text: "An investment in knowledge pays the best interest.",
      author: "Benjamin Franklin"
    },
    {
      text: "It's not that I'm so smart, it's just that I stay with problems longer.",
      author: "Albert Einstein"
    },
    {
      text: "You don't have to be great to start, but you have to start to be great.",
      author: "Zig Ziglar"
    },
    {
      text: "Failure is simply the opportunity to begin again, this time more intelligently.",
      author: "Henry Ford"
    },
    { text: "Consistency is the key. Bawi tayo sa susunod na round, Scholar!", author: "" },
    {
      text: "Algorithms aren't built in a day. Debug your mistakes and try again!",
      author: ""
    }
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
    lastEndReason: ""
  };

  let elements = null;
  let initialized = false;
  let fallbackScores = [];
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 40; // ~12s of retrying before giving up

  function init() {
    if (initialized) return;

    elements = {
      loginView: document.getElementById("loginView"),
      gameView: document.getElementById("gameView"),
      gameOverView: document.getElementById("gameOverView"),
      usernameInput: document.getElementById("usernameInput"),
      startBtn: document.getElementById("startBtn"),
      restartBtn: document.getElementById("restartBtn"),
      loginStatus: document.getElementById("loginStatus"),
      hudUser: document.getElementById("hudUser"),
      hudRank: document.getElementById("hudRank"),
      hudScore: document.getElementById("hudScore"),
      hudLives: document.getElementById("hudLives"),
      subjectChip: document.getElementById("subjectChip"),
      questionText: document.getElementById("questionText"),
      choicesWrap: document.getElementById("choicesWrap"),
      feedback: document.getElementById("feedback"),
      leaderboardBody: document.getElementById("leaderboardBody"),
      finalScore: document.getElementById("finalScore"),
      finalRank: document.getElementById("finalRank")
    };

    const missing = Object.keys(elements).filter((key) => !elements[key]);

    if (missing.length) {
      initAttempts += 1;
      if (initAttempts === 1) {
        console.warn("[Arena] Waiting for DOM elements, missing so far:", missing);
      }
      if (initAttempts >= MAX_INIT_ATTEMPTS) {
        console.error(
          "[Arena] Giving up: these element IDs were never found in the HTML:",
          missing
        );
        return;
      }
      setTimeout(init, 300);
      return;
    }

    injectDynamicElements();

    bindTap(elements.startBtn, (event) => {
      event.preventDefault();
      startGame();
    });

    bindTap(elements.restartBtn, (event) => {
      event.preventDefault();
      rebootArena();
    });

    elements.usernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        startGame();
      }
    });

    document.addEventListener("keydown", handleGlobalKeys);
    window.addEventListener("blur", handleWindowBlur);

    renderLeaderboard();
    updateHud();
    setView("loginView");
    initialized = true;
    console.log("[Arena] Game initialized OK.");
  }

  function injectDynamicElements() {
    if (!elements.statusStrip) {
      const strip = document.createElement("div");
      strip.style.display = "flex";
      strip.style.flexWrap = "wrap";
      strip.style.gap = "8px";
      strip.style.margin = "10px 0 14px";

      const timerBadge = document.createElement("div");
      timerBadge.id = "arenaTimerBadge";
      timerBadge.style.padding = "8px 12px";
      timerBadge.style.borderRadius = "999px";
      timerBadge.style.background = "rgba(14, 165, 233, 0.15)";
      timerBadge.style.border = "1px solid rgba(14, 165, 233, 0.35)";
      timerBadge.style.fontWeight = "700";

      const streakBadge = document.createElement("div");
      streakBadge.id = "arenaStreakBadge";
      streakBadge.style.padding = "8px 12px";
      streakBadge.style.borderRadius = "999px";
      streakBadge.style.background = "rgba(52, 211, 153, 0.15)";
      streakBadge.style.border = "1px solid rgba(52, 211, 153, 0.35)";
      streakBadge.style.fontWeight = "700";

      const lifeBadge = document.createElement("div");
      lifeBadge.id = "arenaLifelineBadge";
      lifeBadge.style.padding = "8px 12px";
      lifeBadge.style.borderRadius = "999px";
      lifeBadge.style.background = "rgba(251, 191, 36, 0.15)";
      lifeBadge.style.border = "1px solid rgba(251, 191, 36, 0.35)";
      lifeBadge.style.fontWeight = "700";

      strip.appendChild(timerBadge);
      strip.appendChild(streakBadge);
      strip.appendChild(lifeBadge);

      elements.questionText.parentNode.insertBefore(strip, elements.questionText);
      elements.statusStrip = strip;
      elements.timerBadge = timerBadge;
      elements.streakBadge = streakBadge;
      elements.lifelineBadge = lifeBadge;
    }

    if (!elements.gameOverNote) {
      const note = document.createElement("div");
      note.id = "gameOverNote";
      note.style.marginTop = "12px";
      note.style.lineHeight = "1.6";
      elements.finalRank.parentNode.appendChild(note);
      elements.gameOverNote = note;
    }

    if (!elements.gameOverQuote) {
      const quote = document.createElement("div");
      quote.id = "gameOverQuote";
      quote.style.marginTop = "10px";
      quote.style.padding = "12px 14px";
      quote.style.borderRadius = "14px";
      quote.style.background = "rgba(255,255,255,0.06)";
      quote.style.lineHeight = "1.6";
      elements.gameOverNote.parentNode.appendChild(quote);
      elements.gameOverQuote = quote;
    }
  }

  function bindTap(element, handler) {
    let touched = false;

    element.addEventListener(
      "touchend",
      (event) => {
        touched = true;
        handler(event);
        setTimeout(() => {
          touched = false;
        }, 350);
      },
      { passive: false }
    );

    element.addEventListener("click", (event) => {
      if (touched) return;
      handler(event);
    });
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getRank(score) {
    const s = parseInt(score, 10) || 0;
    if (s >= 500) return "☄️ Academic Overlord";
    if (s >= 490) return "🌌 Cosmos Architect";
    if (s >= 480) return "🚀 Nebula Sentinel";
    if (s >= 470) return "🔮 Quantum Wizard";
    if (s >= 460) return "🦁 Apex Cyber";
    if (s >= 450) return "👑 Binary King";
    if (s >= 440) return "🧠 Neural Master";
    if (s >= 430) return "🌐 Cloud Emperor";
    if (s >= 420) return "⚡ Kernel Authority";
    if (s >= 410) return "🛡️ Cyber Commander";
    if (s >= 400) return "💎 Deep Thinker";
    if (s >= 390) return "📈 Data Overlord";
    if (s >= 380) return "🎯 Script Monarch";
    if (s >= 370) return "🌟 Tech Vanguard";
    if (s >= 360) return "🧩 Algorithm Guru";
    if (s >= 350) return "🔥 Logic Maestro";
    if (s >= 340) return "🎓 Summa Elite";
    if (s >= 330) return "🎖️ Dean's Lister Plus";
    if (s >= 320) return "💻 Code Captain";
    if (s >= 310) return "📚 Book Expert";
    if (s >= 300) return "🕵️ Lead Bug Hunter";
    if (s >= 290) return "🎨 Syntax Stylist";
    if (s >= 280) return "⚙️ System Voyager";
    if (s >= 270) return "📈 Matrix Analyst";
    if (s >= 260) return "🛡️ Security Analyst";
    if (s >= 250) return "🤖 AI Apprentice";
    if (s >= 240) return "☕ Java Specialist";
    if (s >= 230) return "🐍 Python Wrangler";
    if (s >= 220) return "🌐 Web Artisan";
    if (s >= 210) return "🗄️ Database Seeker";
    if (s >= 200) return "🧩 Logic Practitioner";
    if (s >= 190) return "🧠 Brainiac";
    if (s >= 180) return "📚 Hardcore Reader";
    if (s >= 170) return "🎖️ Dean's Aspirant";
    if (s >= 160) return "🌟 Byte Crusader";
    if (s >= 150) return "💻 Code Cadet";
    if (s >= 140) return "📝 Quiz Champion";
    if (s >= 130) return "🎯 Topic Ace";
    if (s >= 120) return "⚙️ Hardware Explorer";
    if (s >= 110) return "🕵️ Bug Catcher";
    if (s >= 100) return "📚 Avid Scholar";
    if (s >= 90) return "📝 Quiz Cadet";
    if (s >= 80) return "📈 Score Climber";
    if (s >= 70) return "🌱 Script Rookie";
    if (s >= 60) return "⚙️ Tech Starter";
    if (s >= 40) return "🐣 Hello World";
    if (s >= 20) return "🥚 Fresh Enrollee";
    return "🥚 Novice Scholar";
  }

  function getLivesDisplay(lives) {
    return lives > 0 ? "&#10084;".repeat(lives) : "0";
  }

  function setView(name) {
    ["loginView", "gameView", "gameOverView"].forEach((key) => {
      if (key === name) {
        elements[key].classList.add("active");
      } else {
        elements[key].classList.remove("active");
      }
    });
  }

  function updateHud() {
    elements.hudUser.textContent = state.username || "-";
    elements.hudRank.textContent = getRank(state.score);
    elements.hudScore.textContent = String(state.score);
    elements.hudLives.innerHTML = getLivesDisplay(state.lives);

    if (elements.timerBadge) {
      const timerText = state.locked && !state.currentQuestion ? "Stopped" : state.timer + "s";
      elements.timerBadge.textContent = "Timer: " + timerText;
      elements.timerBadge.style.color = state.timer <= 5 ? "#f87171" : "";
    }

    if (elements.streakBadge) {
      elements.streakBadge.textContent =
        "Streak: " + state.streak + "/" + STREAK_TARGET + (state.streak === STREAK_TARGET - 1 ? " - next hit +1" : "");
    }

    if (elements.lifelineBadge) {
      elements.lifelineBadge.textContent =
        "F 50:50 " + (state.hasUsed5050 ? "USED" : "READY") +
        " | S Skip " + (state.hasUsedSkip ? "USED" : "READY");
    }
  }

  function clearFeedback() {
    elements.feedback.textContent = "";
    elements.feedback.classList.remove("is-wrong");
  }

  function resetArena() {
    stopTimer();
    state.score = 0;
    state.lives = MAX_LIVES;
    state.currentQuestion = null;
    state.activePool = shuffle(questionBank);
    state.currentIndex = 0;
    state.locked = false;
    state.streak = 0;
    state.timer = QUESTION_TIME_LIMIT;
    state.hasUsed5050 = false;
    state.hasUsedSkip = false;
    state.hiddenChoices = new Set();
    state.ending = false;
    state.allowBlurPenalty = true;
    state.victoryAchieved = false;
    state.lastEndReason = "";
    elements.choicesWrap.innerHTML = "";
    clearFeedback();
    updateHud();
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    state.timer = QUESTION_TIME_LIMIT;
    updateHud();

    state.timerId = setInterval(() => {
      if (state.locked || state.ending) return;
      state.timer -= 1;
      updateHud();

      if (state.timer <= 0) {
        stopTimer();
        handleTimeExpired();
      }
    }, 1000);
  }

  function nextQuestion() {
    if (state.ending || state.sessionLocked) return;

    if (!state.activePool.length || state.currentIndex >= state.activePool.length) {
      state.activePool = shuffle(questionBank);
      state.currentIndex = 0;
    }

    state.currentQuestion = state.activePool[state.currentIndex];
    state.currentIndex += 1;
    renderQuestion();
  }

  function renderQuestion() {
    if (!state.currentQuestion) return;

    const shuffledChoices = shuffle(state.currentQuestion.choices);
    state.locked = false;
    state.hiddenChoices = new Set();
    clearFeedback();

    elements.subjectChip.textContent = state.currentQuestion.s;
    elements.questionText.textContent = state.currentQuestion.q;
    elements.choicesWrap.innerHTML = "";

    shuffledChoices.forEach((choiceText) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = choiceText;
      button.dataset.choiceValue = choiceText;

      bindTap(button, (event) => {
        event.preventDefault();
        handleAnswer(button, choiceText);
      });

      elements.choicesWrap.appendChild(button);
    });

    startTimer();
    updateHud();
  }

  function disableChoices(answer) {
    const buttons = elements.choicesWrap.querySelectorAll(".choice");
    buttons.forEach((button) => {
      button.disabled = true;
      if (button.textContent === answer && button.style.display !== "none") {
        button.classList.add("correct");
      }
    });
  }

  function moveToNextStep(delay) {
    setTimeout(() => {
      if (state.lives <= 0) {
        endGame(state.lastEndReason || "lives");
      } else {
        nextQuestion();
      }
    }, delay);
  }

  function handleTimeExpired() {
    if (state.locked || !state.currentQuestion || state.ending) return;

    state.locked = true;
    state.streak = 0;
    state.lives -= 1;
    if (state.lives < 0) state.lives = 0;
    state.lastEndReason = "timeout";

    disableChoices(state.currentQuestion.answer);
    elements.feedback.textContent = "Time's up. One heart lost and next question loaded.";
    elements.feedback.classList.add("is-wrong");
    updateHud();
    moveToNextStep(900);
  }

  function handleAnswer(button, selectedChoice) {
    if (state.locked || !state.currentQuestion || state.ending) return;

    state.locked = true;
    stopTimer();

    const isCorrect = selectedChoice === state.currentQuestion.answer;
    disableChoices(state.currentQuestion.answer);

    if (isCorrect) {
      state.streak += 1;
      let earnedPoints = SCORE_PER_CORRECT;

      if (state.streak % STREAK_TARGET === 0) {
        earnedPoints += STREAK_BONUS;
      }

      state.score += earnedPoints;
      button.classList.add("correct");
      elements.feedback.textContent =
        earnedPoints > SCORE_PER_CORRECT
          ? "Correct. +" + earnedPoints + " points with 5-streak bonus."
          : "Correct. +" + earnedPoints + " points secured.";
      elements.feedback.classList.remove("is-wrong");
      updateHud();

      if (state.score >= WIN_SCORE) {
        setTimeout(() => {
          handleGraduationWin();
        }, 850);
        return;
      }
    } else {
      state.streak = 0;
      state.lives -= 1;
      if (state.lives < 0) state.lives = 0;
      state.lastEndReason = "wrong";
      button.classList.add("wrong");
      elements.feedback.textContent = "Wrong answer. One heart lost.";
      elements.feedback.classList.add("is-wrong");
      updateHud();
    }

    moveToNextStep(900);
  }

  function handleGlobalKeys(event) {
    if (!elements || state.sessionLocked || state.ending) return;
    if (!elements.gameView.classList.contains("active")) return;

    const key = String(event.key || "").toLowerCase();
    if (key === "f") {
      event.preventDefault();
      use5050();
    } else if (key === "s") {
      event.preventDefault();
      skipQuestion();
    }
  }

  function use5050() {
    if (!state.currentQuestion || state.locked || state.ending) return;

    if (state.hasUsed5050) {
      elements.feedback.textContent = "50:50 lifeline already used.";
      elements.feedback.classList.add("is-wrong");
      return;
    }

    const buttons = Array.from(elements.choicesWrap.querySelectorAll(".choice"));
    const wrongButtons = buttons.filter(
      (button) =>
        button.textContent !== state.currentQuestion.answer &&
        button.style.display !== "none"
    );

    const buttonsToHide = shuffle(wrongButtons).slice(0, 2);
    buttonsToHide.forEach((button) => {
      button.disabled = true;
      button.style.display = "none";
      state.hiddenChoices.add(button.textContent);
    });

    state.hasUsed5050 = true;
    elements.feedback.textContent = "50:50 activated. Two wrong choices removed.";
    elements.feedback.classList.remove("is-wrong");
    updateHud();
  }

  function skipQuestion() {
    if (!state.currentQuestion || state.locked || state.ending) return;

    if (state.hasUsedSkip) {
      elements.feedback.textContent = "Skip lifeline already used.";
      elements.feedback.classList.add("is-wrong");
      return;
    }

    state.hasUsedSkip = true;
    state.locked = true;
    state.streak = 0;
    stopTimer();
    elements.feedback.textContent = "Question skipped. No points gained, no life lost.";
    elements.feedback.classList.remove("is-wrong");
    updateHud();

    setTimeout(() => {
      nextQuestion();
    }, 350);
  }

  function handleWindowBlur() {
    if (state.ending || state.sessionLocked || !state.allowBlurPenalty) return;
    if (!elements || !elements.gameView.classList.contains("active")) return;
    if (!state.currentQuestion) return;

    state.lives = 0;
    state.streak = 0;
    state.lastEndReason = "blur";
    endGame("blur");
  }

  function canUseLocalStorage() {
    try {
      const testKey = "__bscs1a_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn("[Arena] localStorage not available:", error);
      return false;
    }
  }

  function readLocalLeaderboard() {
    try {
      if (!canUseLocalStorage()) {
        return fallbackScores.slice();
      }
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("[Arena] Failed to read local leaderboard:", error);
      return fallbackScores.slice();
    }
  }

  function writeLocalLeaderboard(entries) {
    if (canUseLocalStorage()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } else {
      fallbackScores = entries.slice();
    }
  }

  function getUserPathKey(username) {
    return sanitizeUsername(username)
      .toLowerCase()
      .replace(/[.#$[\]/]/g, "_")
      .replace(/\s+/g, "_");
  }

  async function readFirebaseLeaderboard() {
    if (!db) return [];
    try {
      const snapshot = await get(ref(db, FIREBASE_TABLE));
      if (!snapshot.exists()) return [];
      const raw = snapshot.val();
      return Object.keys(raw).map((key) => raw[key]);
    } catch (error) {
      console.error("[Arena] Failed to read Firebase leaderboard (check your Realtime Database rules):", error);
      return [];
    }
  }

  async function readFirebaseUserScore(username) {
    if (!db) return null;
    try {
      const key = getUserPathKey(username);
      const snapshot = await get(ref(db, FIREBASE_TABLE + "/" + key));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error("[Arena] Failed to read Firebase user score (check your Realtime Database rules):", error);
      return null;
    }
  }

  async function writeFirebaseScore(entry) {
    if (!db) return false;
    try {
      const key = getUserPathKey(entry.username);
      const userRef = ref(db, FIREBASE_TABLE + "/" + key);
      const snapshot = await get(userRef);
      const existing = snapshot.exists() ? snapshot.val() : null;
      const existingScore = existing ? Number(existing.score || existing.highScore || 0) : 0;

      if (entry.score <= existingScore) {
        return false;
      }

      await set(userRef, {
        username: entry.username,
        score: entry.score,
        highScore: entry.score,
        badge: entry.badge,
        updatedAt: Date.now(),
        createdAt: existing && existing.createdAt ? existing.createdAt : Date.now()
      });

      return true;
    } catch (error) {
      console.error("[Arena] Failed to WRITE score to Firebase (check your Realtime Database rules):", error);
      return false;
    }
  }

  function sortEntries(entries) {
    return entries.sort((a, b) => {
      if (Number(b.score) !== Number(a.score)) return Number(b.score) - Number(a.score);
      return Number(a.updatedAt || a.createdAt || 0) - Number(b.updatedAt || b.createdAt || 0);
    });
  }

  function upsertLocalHighScore(entry) {
    const localEntries = readLocalLeaderboard();
    const key = getUserPathKey(entry.username);
    const existingIndex = localEntries.findIndex(
      (item) => getUserPathKey(item.username) === key
    );

    if (existingIndex >= 0) {
      const existingScore = Number(localEntries[existingIndex].score || 0);
      if (entry.score > existingScore) {
        localEntries[existingIndex] = entry;
      }
    } else {
      localEntries.push(entry);
    }

    const sorted = sortEntries(localEntries);
    writeLocalLeaderboard(sorted.slice(0, 10));
  }

  async function readLeaderboard() {
    const firebaseEntries = await readFirebaseLeaderboard();
    if (firebaseEntries.length) {
      const sorted = sortEntries(firebaseEntries);
      writeLocalLeaderboard(sorted.slice(0, 10));
      return sorted.slice(0, 10);
    }

    const localEntries = readLocalLeaderboard();
    return sortEntries(localEntries).slice(0, 10);
  }

  async function saveScore() {
    if (!state.username) return;

    const entry = {
      username: state.username,
      score: state.score,
      badge: getRank(state.score),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    upsertLocalHighScore(entry);
    await writeFirebaseScore(entry);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function renderLeaderboard() {
    const entries = await readLeaderboard();
    elements.leaderboardBody.innerHTML = "";

    if (!entries.length) {
      elements.leaderboardBody.innerHTML =
        '<tr><td colspan="4" class="lb-empty">No challenger records yet.</td></tr>';
      return;
    }

    entries.forEach((entry, index) => {
      const row = document.createElement("tr");
      row.innerHTML =
        "<td>" + (index + 1) + "</td>" +
        "<td>" + escapeHtml(entry.username) + "</td>" +
        "<td>" + escapeHtml(entry.badge) + "</td>" +
        "<td>" + Number(entry.score) + "</td>";
      elements.leaderboardBody.appendChild(row);
    });
  }

  function sanitizeUsername(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeWord(value) {
    return sanitizeUsername(value).toLowerCase();
  }

  function hasBadWord(username) {
    const cleanName = normalizeWord(username);
    return badWords.some((word) => cleanName.includes(normalizeWord(word)));
  }

  function getRandomQuote() {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  }

  function formatQuote(quote) {
    return '"' + quote.text + '"' + (quote.author ? " — " + quote.author : "");
  }

  async function startGame() {
    if (state.sessionLocked) {
      elements.loginStatus.textContent =
        "Locked na ang session na ito. I-reload ang page para sa bagong arena run.";
      return;
    }

    const username = sanitizeUsername(elements.usernameInput.value);

    if (!username) {
      elements.loginStatus.textContent =
        "Maglagay muna ng valid username bago simulan ang arena.";
      elements.usernameInput.focus();
      return;
    }

    if (hasBadWord(username)) {
      alert("Bawal ang username na may inappropriate o bad words.");
      elements.loginStatus.textContent = "Pumili ng malinis na username bago magsimula.";
      elements.usernameInput.focus();
      return;
    }

    elements.startBtn.disabled = true;
    state.username = username.slice(0, 22);
    elements.usernameInput.value = state.username;

    const existingRecord = await readFirebaseUserScore(state.username);
    state.bestScore = existingRecord ? Number(existingRecord.score || existingRecord.highScore || 0) : 0;

    elements.loginStatus.textContent = state.bestScore
      ? "Cloud resume found. Best score: " + state.bestScore + ". Good luck, challenger."
      : "Arena initialized. Good luck, challenger.";

    resetArena();
    setView("gameView");
    nextQuestion();
    elements.startBtn.disabled = false;
  }

  function createOverlayShell() {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "99999";
    overlay.style.background = "rgba(2, 6, 23, 0.82)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "20px";

    const panel = document.createElement("div");
    panel.style.width = "min(760px, 92vw)";
    panel.style.maxHeight = "88vh";
    panel.style.overflowY = "auto";
    panel.style.borderRadius = "24px";
    panel.style.padding = "28px";
    panel.style.background = "linear-gradient(180deg, #071427, #0b1d36)";
    panel.style.color = "#ffffff";
    panel.style.boxShadow = "0 24px 60px rgba(0,0,0,0.4)";
    panel.style.border = "1px solid rgba(125, 211, 252, 0.2)";

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    return { overlay, panel };
  }

  function playVictoryFanfare() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((note, index) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = note;
      gainNode.gain.value = 0.0001;
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const startAt = audioCtx.currentTime + index * 0.18;
      gainNode.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28);

      oscillator.start(startAt);
      oscillator.stop(startAt + 0.32);
    });
  }

  function startConfettiEffect() {
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99990";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const colors = ["#38bdf8", "#22c55e", "#f59e0b", "#f472b6", "#a78bfa", "#ffffff"];
    const pieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: -2 + Math.random() * 4,
      speedY: 2 + Math.random() * 5,
      rotate: Math.random() * Math.PI * 2,
      rotateSpeed: -0.2 + Math.random() * 0.4
    }));

    let running = true;
    let frameId = null;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function render() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach((piece) => {
        piece.x += piece.speedX;
        piece.y += piece.speedY;
        piece.rotate += piece.rotateSpeed;

        if (piece.y > canvas.height + 30) {
          piece.y = -20;
          piece.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotate);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        ctx.restore();
      });

      frameId = requestAnimationFrame(render);
    }

    window.addEventListener("resize", resizeCanvas);
    render();

    return function stopConfetti() {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resizeCanvas);
      canvas.remove();
    };
  }

  function showGraduationModal() {
    return new Promise((resolve) => {
      const { overlay, panel } = createOverlayShell();

      panel.innerHTML =
        "<h2 style='margin:0 0 12px;font-size:32px;'>🎓 CONGRATULATIONS, GRADUATE! 🎓</h2>" +
        "<p style='line-height:1.7;margin:0 0 10px;'>You have officially conquered the BSCS 1-A Academic Reviewer Arena with a Perfect Master Score of 500+! You are now certified as the ultimate <strong>Academic Overlord</strong> of the section. Good luck on your actual exams, Scholar!</p>" +
        "<p style='margin:0 0 8px;'><strong>Final Score:</strong> " + state.score + "</p>" +
        "<p style='margin:0 0 18px;'><strong>Rank:</strong> " + escapeHtml(getRank(state.score)) + "</p>";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Close Graduation Modal";
      button.style.padding = "12px 18px";
      button.style.border = "0";
      button.style.borderRadius = "14px";
      button.style.cursor = "pointer";
      button.style.fontWeight = "700";
      button.style.background = "#34d399";
      button.style.color = "#062033";

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
      "<h2 style='margin:0 0 12px;font-size:28px;'>Session Locked</h2>" +
      "<p style='line-height:1.7;margin:0 0 16px;'>Na-save na ang iyong graduation score sa cloud. Para maiwasan ang abuse, naka-lock na ang current session. I-reload ang page para sa bagong arena run.</p>";

    const reloadButton = document.createElement("button");
    reloadButton.type = "button";
    reloadButton.textContent = "Reload Page";
    reloadButton.style.padding = "12px 18px";
    reloadButton.style.border = "0";
    reloadButton.style.borderRadius = "14px";
    reloadButton.style.cursor = "pointer";
    reloadButton.style.fontWeight = "700";
    reloadButton.style.background = "#38bdf8";
    reloadButton.style.color = "#062033";
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
    elements.loginStatus.textContent =
      "Graduation complete. Session locked to prevent score abuse.";
    showSessionLockScreen();
  }

  function updateGameOverDisplay(reason) {
    const quote = getRandomQuote();
    const messageMap = {
      lives: "Naubos ang hearts mo sa arena. Regroup, review, then bounce back.",
      wrong: "That final mistake ended the run, pero kaya mo pang higitan ito.",
      timeout: "Naubos ang oras sa huling tanong mo. Bilisan ang recall sa next round.",
      blur: "Auto game over ito dahil lumipat ka ng browser tab habang active ang game."
    };

    elements.gameOverNote.innerHTML =
      "<strong>Status:</strong> " + escapeHtml(messageMap[reason] || messageMap.lives);
    elements.gameOverQuote.textContent = formatQuote(quote);
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
    elements.loginStatus.textContent =
      "Enter your username to begin the reviewer challenge.";
    setView("loginView");
    elements.usernameInput.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
