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

  /* ============ NEW FEATURE: ⚔️ Boss Question subject-hack ============
     At these exact score checkpoints, the next question is force-pulled
     from the hardest subject pool and the timer is slashed. */
  const BOSS_THRESHOLDS = [50, 150, 250, 350, 450];
  const BOSS_SUBJECT = "ITEC 102";
  const BOSS_TIME_LIMIT = 15;
  const BOSS_SCORE_PER_CORRECT = 4;
  const BOSS_FLASH_DURATION_MS = 1500;

  /* ============ NEW FEATURE: 🔊 Retro Web Audio FX ============
     Pure OscillatorNode chiptune blips — zero external audio files,
     zero mobile-data loading delay. */
  const SOUND_MUTE_KEY = "bscs1a_arena_sound_muted_v1";
  const MILESTONE_FANFARE_SCORE_STEP = 25;
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

    { s: "ITEC 102", q: "What is a program?", choices: ["A set of instructions that tells a computer what to do", "A physical part of the computer", "A type of computer virus", "A brand of laptop"], answer: "A set of instructions that tells a computer what to do" },
    { s: "ITEC 102", q: "What is a programming language?", choices: ["A formal language used to write instructions for a computer", "A spoken human language", "A type of operating system", "A network protocol"], answer: "A formal language used to write instructions for a computer" },
    { s: "ITEC 102", q: "Who is a programmer?", choices: ["A person who writes and develops computer programs", "A person who repairs computer hardware", "A person who sells computers", "A person who designs furniture"], answer: "A person who writes and develops computer programs" },
    { s: "ITEC 102", q: "What is an algorithm?", choices: ["A step-by-step procedure for solving a problem", "A computer virus", "A hardware upgrade", "A file compression tool"], answer: "A step-by-step procedure for solving a problem" },
    { s: "ITEC 102", q: "What is pseudocode?", choices: ["A plain-language way to describe program steps", "An antivirus program", "Final compiled machine code", "A spreadsheet formula"], answer: "A plain-language way to describe program steps" },
    { s: "ITEC 102", q: "What is a flowchart?", choices: ["A diagram that shows the steps of a process using symbols", "A type of computer chip", "A programming language", "A file storage format"], answer: "A diagram that shows the steps of a process using symbols" },
    { s: "ITEC 102", q: "Which flowchart symbol is used to represent a decision?", choices: ["Diamond", "Circle", "Rectangle", "Oval"], answer: "Diamond" },
    { s: "ITEC 102", q: "Which flowchart symbol represents the start or end of a process?", choices: ["Oval/Terminator", "Diamond", "Parallelogram", "Rectangle"], answer: "Oval/Terminator" },
    { s: "ITEC 102", q: "Which flowchart symbol represents a process or action step?", choices: ["Rectangle", "Diamond", "Circle", "Triangle"], answer: "Rectangle" },
    { s: "ITEC 102", q: "Which flowchart symbol represents input or output?", choices: ["Parallelogram", "Rectangle", "Oval", "Diamond"], answer: "Parallelogram" },
    { s: "ITEC 102", q: "What is the first step in problem solving using programming?", choices: ["Understanding the problem", "Writing the code", "Testing the program", "Debugging the program"], answer: "Understanding the problem" },
    { s: "ITEC 102", q: "Which of the following is the correct general order in problem solving?", choices: ["Analyze problem, design algorithm, code, test", "Code, analyze problem, test, design algorithm", "Test, code, design algorithm, analyze problem", "Design algorithm, test, code, analyze problem"], answer: "Analyze problem, design algorithm, code, test" },
    { s: "ITEC 102", q: "What does it mean to 'debug' a program?", choices: ["To find and fix errors in the program", "To delete the entire program", "To install a new browser", "To format the hard drive"], answer: "To find and fix errors in the program" },
    { s: "ITEC 102", q: "Why is planning an algorithm before coding important?", choices: ["It helps organize the logical steps before implementation", "It makes the program run faster automatically", "It removes the need for testing", "It compiles the code for you"], answer: "It helps organize the logical steps before implementation" },
    { s: "ITEC 102", q: "What is a step-by-step written description of a solution called before it is coded?", choices: ["Algorithm", "Compiler", "Debugger", "Syntax"], answer: "Algorithm" },
    { s: "ITEC 102", q: "C# was developed primarily by which company?", choices: ["Microsoft", "Apple", "Google", "Oracle"], answer: "Microsoft" },
    { s: "ITEC 102", q: "C# is often associated with which development framework?", choices: [".NET Framework", "React Native", "Django", "Laravel"], answer: ".NET Framework" },
    { s: "ITEC 102", q: "What is an IDE used for in programming?", choices: ["Writing, editing, and running code in one environment", "Browsing the internet", "Designing logos", "Editing videos"], answer: "Writing, editing, and running code in one environment" },
    { s: "ITEC 102", q: "Which of the following is a commonly used IDE for C# development?", choices: ["Visual Studio", "Photoshop", "Excel", "Chrome"], answer: "Visual Studio" },
    { s: "ITEC 102", q: "Before writing a C# program, what must typically be installed first?", choices: [".NET SDK", "A web browser", "An antivirus", "A media player"], answer: ".NET SDK" },
    { s: "ITEC 102", q: "In C#, which keyword is commonly used to output text to the console?", choices: ["Console.WriteLine", "Console.Input", "System.Print", "Output.Show"], answer: "Console.WriteLine" },
    { s: "ITEC 102", q: "Which C# method is commonly used to read input from the user in the console?", choices: ["Console.ReadLine", "Console.WriteLine", "Console.Print", "Input.Get"], answer: "Console.ReadLine" },
    { s: "ITEC 102", q: "What is the purpose of the Main method in a C# program?", choices: ["It is the entry point where program execution begins", "It stores all variables permanently", "It compiles the program", "It connects to the internet"], answer: "It is the entry point where program execution begins" },
    { s: "ITEC 102", q: "Every statement in C# typically ends with what character?", choices: ["Semicolon (;)", "Colon (:)", "Comma (,)", "Period (.)"], answer: "Semicolon (;)" },
    { s: "ITEC 102", q: "Curly braces { } in C# are mainly used to do what?", choices: ["Define a block of code", "Store a single number", "End a program", "Import a library"], answer: "Define a block of code" },
    { s: "ITEC 102", q: "What is basic syntax in programming?", choices: ["The set of rules that defines correctly structured code", "A type of algorithm", "A hardware component", "A file extension"], answer: "The set of rules that defines correctly structured code" },
    { s: "ITEC 102", q: "What does simple I/O refer to in programming?", choices: ["Basic input and output operations", "Installing and operating hardware", "Internal optimization", "Image output only"], answer: "Basic input and output operations" },
    { s: "ITEC 102", q: "Which term describes taking data from the user through the keyboard?", choices: ["Input", "Output", "Compilation", "Debugging"], answer: "Input" },
    { s: "ITEC 102", q: "Which term describes displaying results to the screen?", choices: ["Output", "Input", "Compilation", "Syntax"], answer: "Output" },
    { s: "ITEC 102", q: "What is a compiler mainly responsible for?", choices: ["Translating source code into machine-executable code", "Designing the user interface", "Connecting to the internet", "Storing files permanently"], answer: "Translating source code into machine-executable code" },
    { s: "ITEC 102", q: "Which of the following best describes a comment in C# code?", choices: ["A note in the code ignored by the compiler", "A required syntax element", "A type of variable", "A loop structure"], answer: "A note in the code ignored by the compiler" },
    { s: "ITEC 102", q: "In C#, how do you write a single-line comment?", choices: ["// comment", "<!-- comment -->", "# comment", "/* comment"], answer: "// comment" },
    { s: "ITEC 102", q: "Data types in C# are generally classified into which two categories?", choices: ["Primitive and Non-primitive", "Static and Dynamic only", "Local and Global only", "Public and Private only"], answer: "Primitive and Non-primitive" },
    { s: "ITEC 102", q: "Which of the following is an example of a value type in C#?", choices: ["int", "string", "object", "class"], answer: "int" },
    { s: "ITEC 102", q: "Which of the following is an example of a reference type in C#?", choices: ["string", "int", "bool", "double"], answer: "string" },
    { s: "ITEC 102", q: "What best describes a Value Type in C#?", choices: ["A type that directly holds its data", "A type that stores only a reference to data", "A type only used for text", "A type that cannot store numbers"], answer: "A type that directly holds its data" },
    { s: "ITEC 102", q: "What best describes a Reference Type in C#?", choices: ["A type that stores a reference to the memory location of the data", "A type that always stores whole numbers", "A type used only for constants", "A type with no memory allocation"], answer: "A type that stores a reference to the memory location of the data" },
    { s: "ITEC 102", q: "Which C# data type is used to represent decimal numbers with high precision?", choices: ["decimal", "int", "bool", "char"], answer: "decimal" },
    { s: "ITEC 102", q: "Which C# data type is used to represent true or false values?", choices: ["bool", "int", "char", "string"], answer: "bool" },
    { s: "ITEC 102", q: "Which C# data type is used to store a single character?", choices: ["char", "string", "int", "bool"], answer: "char" },
    { s: "ITEC 102", q: "Which data type is best suited for storing text such as names?", choices: ["string", "char", "int", "bool"], answer: "string" },
    { s: "ITEC 102", q: "What is the 'object' type in C# considered to be?", choices: ["The base type from which all other types derive", "A type only for numbers", "A type only for booleans", "An invalid data type"], answer: "The base type from which all other types derive" },
    { s: "ITEC 102", q: "What does the 'dynamic' type in C# allow?", choices: ["Bypassing compile-time type checking, resolved at runtime", "Storing only static values", "Preventing all runtime errors", "Deleting variables automatically"], answer: "Bypassing compile-time type checking, resolved at runtime" },
    { s: "ITEC 102", q: "What does a pointer type in C# store?", choices: ["The memory address of a variable", "The value of a variable directly", "A text string only", "A boolean result"], answer: "The memory address of a variable" },
    { s: "ITEC 102", q: "What is a variable in programming?", choices: ["A named storage location that holds a value that can change", "A fixed value that never changes", "A type of loop", "A programming error"], answer: "A named storage location that holds a value that can change" },
    { s: "ITEC 102", q: "What does it mean to 'define' a variable?", choices: ["To declare its name and data type", "To permanently delete it", "To convert it into a constant", "To compile the program"], answer: "To declare its name and data type" },
    { s: "ITEC 102", q: "What does it mean to 'initialize' a variable?", choices: ["To assign it an initial value", "To delete its declaration", "To change its data type at runtime", "To make it a constant automatically"], answer: "To assign it an initial value" },
    { s: "ITEC 102", q: "How can a program accept a value from the user in C#?", choices: ["Using Console.ReadLine()", "Using Console.WriteLine()", "Using a for loop", "Using a class definition"], answer: "Using Console.ReadLine()" },
    { s: "ITEC 102", q: "What is a constant in programming?", choices: ["A value that cannot be changed once assigned", "A value that changes every second", "A type of loop", "A kind of array"], answer: "A value that cannot be changed once assigned" },
    { s: "ITEC 102", q: "Which keyword is used to declare a constant in C#?", choices: ["const", "var", "static", "readonly only"], answer: "const" },
    { s: "ITEC 102", q: "Which of the following is an example of a basic arithmetic computation?", choices: ["Addition of two numbers", "Opening a file", "Declaring a class", "Creating an object"], answer: "Addition of two numbers" },
    { s: "ITEC 102", q: "Which symbol is used for addition in C#?", choices: ["+", "-", "*", "/"], answer: "+" },
    { s: "ITEC 102", q: "Which symbol is used for subtraction in C#?", choices: ["-", "+", "*", "%"], answer: "-" },
    { s: "ITEC 102", q: "Which symbol is used for multiplication in C#?", choices: ["*", "+", "-", "/"], answer: "*" },
    { s: "ITEC 102", q: "Which symbol is used for division in C#?", choices: ["/", "*", "+", "%"], answer: "/" },
    { s: "ITEC 102", q: "What does the modulus operator (%) return?", choices: ["The remainder of a division", "The sum of two numbers", "The square root of a number", "The product of two numbers"], answer: "The remainder of a division" },
    { s: "ITEC 102", q: "Which operator is used to check if two values are equal in C#?", choices: ["==", "=", "!=", "<>"], answer: "==" },
    { s: "ITEC 102", q: "Which operator is used to check if a value is not equal to another in C#?", choices: ["!=", "==", "=", "<>"], answer: "!=" },
    { s: "ITEC 102", q: "Which operator checks if one value is greater than another?", choices: [">", "<", "==", "!="], answer: ">" },
    { s: "ITEC 102", q: "Which operator checks if one value is less than or equal to another?", choices: ["<=", ">=", "==", "!="], answer: "<=" },
    { s: "ITEC 102", q: "Which logical operator represents AND in C#?", choices: ["&&", "||", "!", "%%"], answer: "&&" },
    { s: "ITEC 102", q: "Which logical operator represents OR in C#?", choices: ["||", "&&", "!", "=="], answer: "||" },
    { s: "ITEC 102", q: "Which logical operator represents NOT in C#?", choices: ["!", "&&", "||", "=="], answer: "!" },
    { s: "ITEC 102", q: "What does a comparison operator do?", choices: ["It compares two values and returns a Boolean result", "It stores a value permanently", "It creates a new class", "It deletes a variable"], answer: "It compares two values and returns a Boolean result" },
    { s: "ITEC 102", q: "What is the single assignment operator in C# used for?", choices: ["Assigning a value to a variable", "Comparing two values", "Looping through data", "Declaring a class"], answer: "Assigning a value to a variable" },
    { s: "ITEC 102", q: "Which of these is considered a non-primitive data type?", choices: ["Array", "int", "bool", "char"], answer: "Array" },
    { s: "ITEC 102", q: "What is the correct term for combining two strings together?", choices: ["Concatenation", "Division", "Iteration", "Instantiation"], answer: "Concatenation" },
    { s: "ITEC 102", q: "What is the purpose of a conditional statement?", choices: ["To make decisions based on a condition", "To repeat a block of code", "To store multiple values", "To define a class"], answer: "To make decisions based on a condition" },
    { s: "ITEC 102", q: "Which keyword starts a basic conditional statement in C#?", choices: ["if", "loop", "switch case only", "for"], answer: "if" },
    { s: "ITEC 102", q: "What does an 'if-else' statement allow a program to do?", choices: ["Execute one block if a condition is true, another if false", "Repeat code infinitely", "Store multiple data types", "Skip all conditions"], answer: "Execute one block if a condition is true, another if false" },
    { s: "ITEC 102", q: "What is a 'nested if' statement?", choices: ["An if statement placed inside another if statement", "A loop inside another loop", "A class inside another class", "An array inside another array"], answer: "An if statement placed inside another if statement" },
    { s: "ITEC 102", q: "What is the main use of a 'switch case' statement?", choices: ["To select one of many code blocks to execute based on a value", "To repeat a block of code indefinitely", "To declare variables", "To create objects"], answer: "To select one of many code blocks to execute based on a value" },
    { s: "ITEC 102", q: "In a switch statement, what does the 'default' case represent?", choices: ["The block executed when no other case matches", "The first case checked", "An error in the program", "A required loop"], answer: "The block executed when no other case matches" },
    { s: "ITEC 102", q: "In a switch statement, what keyword is used to prevent fall-through to the next case?", choices: ["break", "continue", "return only", "exit"], answer: "break" },
    { s: "ITEC 102", q: "What is an array?", choices: ["A structure that stores multiple values of the same type", "A single variable holding one value", "A type of loop", "A programming error"], answer: "A structure that stores multiple values of the same type" },
    { s: "ITEC 102", q: "In many programming languages including C#, an array index typically starts at what number?", choices: ["0", "1", "2", "10"], answer: "0" },
    { s: "ITEC 102", q: "What is required to declare an array in C#?", choices: ["The data type and array size or initial values", "Only the array name", "A loop statement", "A class definition"], answer: "The data type and array size or initial values" },
    { s: "ITEC 102", q: "How do you access a specific element in an array?", choices: ["Using its index number inside square brackets", "Using its name only", "Using a switch statement", "Using a constructor"], answer: "Using its index number inside square brackets" },
    { s: "ITEC 102", q: "What is a multidimensional array?", choices: ["An array that has more than one dimension, like rows and columns", "An array that stores only strings", "An array with no elements", "An array that cannot be modified"], answer: "An array that has more than one dimension, like rows and columns" },
    { s: "ITEC 102", q: "Which of the following is considered an array operation?", choices: ["Sorting the elements of an array", "Declaring a class", "Creating a constructor", "Reading a file"], answer: "Sorting the elements of an array" },
    { s: "ITEC 102", q: "What is an iterative statement used for?", choices: ["To repeat a block of code multiple times", "To declare a variable once", "To end a program", "To create a class"], answer: "To repeat a block of code multiple times" },
    { s: "ITEC 102", q: "Which loop is best used when the number of iterations is already known?", choices: ["for loop", "while loop", "do-while loop", "if statement"], answer: "for loop" },
    { s: "ITEC 102", q: "Which loop is commonly used to iterate through each element of a collection or array?", choices: ["foreach loop", "if-else", "switch case", "constructor"], answer: "foreach loop" },
    { s: "ITEC 102", q: "Which loop checks its condition before executing the loop body?", choices: ["while loop", "do-while loop", "foreach loop", "switch case"], answer: "while loop" },
    { s: "ITEC 102", q: "Which loop guarantees that the loop body executes at least once?", choices: ["do-while loop", "while loop", "for loop", "if statement"], answer: "do-while loop" },
    { s: "ITEC 102", q: "What is an infinite loop?", choices: ["A loop that never meets its stopping condition", "A loop used only for arrays", "A loop that runs exactly once", "A loop that stores images"], answer: "A loop that never meets its stopping condition" },
    { s: "ITEC 102", q: "In a for loop, which part usually controls when the loop stops?", choices: ["The condition", "The initialization only", "The increment only", "The loop body only"], answer: "The condition" },
    { s: "ITEC 102", q: "What does the 'break' keyword do inside a loop?", choices: ["It exits the loop immediately", "It restarts the loop from the beginning", "It skips only the current iteration", "It declares a new variable"], answer: "It exits the loop immediately" },
    { s: "ITEC 102", q: "What does the 'continue' keyword do inside a loop?", choices: ["It skips the rest of the current iteration and moves to the next", "It stops the loop completely", "It deletes the loop variable", "It creates a new array"], answer: "It skips the rest of the current iteration and moves to the next" },
    { s: "ITEC 102", q: "Which control structure would best handle multiple discrete options like a menu selection?", choices: ["Switch case", "For loop", "While loop", "Array declaration"], answer: "Switch case" },
    { s: "ITEC 102", q: "What is the term for the process of repeating a set of instructions?", choices: ["Iteration", "Instantiation", "Inheritance", "Initialization"], answer: "Iteration" },
    { s: "ITEC 102", q: "Which of the following best distinguishes a while loop from a do-while loop?", choices: ["A while loop may not execute at all if the condition is false from the start", "A while loop always executes at least once", "A do-while loop never checks a condition", "A do-while loop cannot use a Boolean condition"], answer: "A while loop may not execute at all if the condition is false from the start" },
    { s: "ITEC 102", q: "What must be true for a for loop's condition to keep the loop running?", choices: ["The condition must evaluate to true", "The condition must evaluate to false", "The loop body must be empty", "The array must be sorted"], answer: "The condition must evaluate to true" },
    { s: "ITEC 102", q: "How many dimensions does a standard single-dimensional array have?", choices: ["One", "Two", "Three", "Zero"], answer: "One" },
    { s: "ITEC 102", q: "What is typically used to traverse and print all elements of an array?", choices: ["A loop", "A single if statement", "A constructor", "A switch case only"], answer: "A loop" },
    { s: "ITEC 102", q: "What does OOP stand for?", choices: ["Object-Oriented Programming", "Only One Program", "Open Operating Protocol", "Organized Output Procedure"], answer: "Object-Oriented Programming" },
    { s: "ITEC 102", q: "What is the main idea behind Object-Oriented Programming?", choices: ["Organizing code around objects that combine data and behavior", "Writing code without any structure", "Using only loops for everything", "Avoiding the use of variables"], answer: "Organizing code around objects that combine data and behavior" },
    { s: "ITEC 102", q: "Which of the following is considered a benefit of OOP?", choices: ["Improved code reusability and maintainability", "Slower program execution always", "Elimination of all bugs automatically", "Removal of the need for testing"], answer: "Improved code reusability and maintainability" },
    { s: "ITEC 102", q: "Which of the following is a core concept of OOP?", choices: ["Encapsulation", "Compilation", "Debugging", "Formatting"], answer: "Encapsulation" },
    { s: "ITEC 102", q: "What is a class in OOP?", choices: ["A blueprint or template for creating objects", "A single instance of data", "A type of loop", "A file storage method"], answer: "A blueprint or template for creating objects" },
    { s: "ITEC 102", q: "What is the main purpose of a class?", choices: ["To define the structure and behavior that objects of that type will have", "To store a single number permanently", "To connect to a database only", "To compile the program"], answer: "To define the structure and behavior that objects of that type will have" },
    { s: "ITEC 102", q: "What are fields (attributes) in a class used for?", choices: ["To store the data or state of an object", "To define loops", "To create comments", "To import libraries"], answer: "To store the data or state of an object" },
    { s: "ITEC 102", q: "What is a constructor in a class?", choices: ["A special method used to initialize a new object", "A loop that repeats forever", "A variable that never changes", "A file reading method"], answer: "A special method used to initialize a new object" },
    { s: "ITEC 102", q: "What is an object in OOP?", choices: ["An instance of a class", "A type of loop", "A syntax error", "A comment in code"], answer: "An instance of a class" },
    { s: "ITEC 102", q: "What does it mean to instantiate an object?", choices: ["To create a new instance of a class", "To delete a class permanently", "To compile the source code", "To read a file"], answer: "To create a new instance of a class" },
    { s: "ITEC 102", q: "What is a reference variable in OOP?", choices: ["A variable that holds the memory address of an object", "A variable that stores only text", "A variable used only in loops", "A constant value"], answer: "A variable that holds the memory address of an object" },
    { s: "ITEC 102", q: "What is a method in a class?", choices: ["A block of code that defines an action or behavior of an object", "A single stored number", "A type of array", "A kind of file format"], answer: "A block of code that defines an action or behavior of an object" },
    { s: "ITEC 102", q: "What is the main purpose of a method?", choices: ["To perform a specific task or operation", "To store the class name only", "To end the program automatically", "To create comments"], answer: "To perform a specific task or operation" },
    { s: "ITEC 102", q: "Which of the following is part of a method declaration syntax?", choices: ["Return type, method name, and parameters", "Only the method name", "Only the class name", "Only a loop statement"], answer: "Return type, method name, and parameters" },
    { s: "ITEC 102", q: "Which OOP concept allows a class to hide its internal details from outside access?", choices: ["Encapsulation", "Iteration", "Compilation", "Instantiation"], answer: "Encapsulation" },
    { s: "ITEC 102", q: "Which OOP concept allows a new class to acquire properties of an existing class?", choices: ["Inheritance", "Encapsulation", "Iteration", "Instantiation"], answer: "Inheritance" },
    { s: "ITEC 102", q: "Which OOP concept allows objects to take on many forms?", choices: ["Polymorphism", "Encapsulation", "Instantiation", "Iteration"], answer: "Polymorphism" },
    { s: "ITEC 102", q: "Which OOP concept focuses on hiding complex implementation details and showing only necessary features?", choices: ["Abstraction", "Iteration", "Instantiation", "Compilation"], answer: "Abstraction" },
    { s: "ITEC 102", q: "What is file streaming used for in programming?", choices: ["Reading data from or writing data to files", "Compiling source code", "Creating classes", "Declaring variables"], answer: "Reading data from or writing data to files" },
    { s: "ITEC 102", q: "Which class is commonly used to read files character by character in a buffered way?", choices: ["BufferedReader", "PrintWriter", "FileWriter", "Scanner only"], answer: "BufferedReader" },
    { s: "ITEC 102", q: "Which class is commonly used along with FileReader to efficiently read text files?", choices: ["BufferedReader", "FileOutputStream", "DataOutputStream", "PrintWriter"], answer: "BufferedReader" },
    { s: "ITEC 102", q: "Which class allows reading files as a stream of raw bytes?", choices: ["FileInputStream", "FileWriter", "PrintWriter", "BufferedWriter"], answer: "FileInputStream" },
    { s: "ITEC 102", q: "Which class is used together with FileInputStream to read primitive data types from a file?", choices: ["DataInputStream", "FileWriter", "PrintWriter", "BufferedWriter"], answer: "DataInputStream" },
    { s: "ITEC 102", q: "Which class is commonly used to read input including files in a simple, convenient way?", choices: ["Scanner", "PrintWriter", "FileOutputStream", "DataOutputStream"], answer: "Scanner" },
    { s: "ITEC 102", q: "Which class is commonly used to write character data to a file?", choices: ["FileWriter", "FileReader", "Scanner", "DataInputStream"], answer: "FileWriter" },
    { s: "ITEC 102", q: "Which class is commonly used together with FileWriter to efficiently write text to files?", choices: ["BufferedWriter", "FileInputStream", "DataInputStream", "Scanner"], answer: "BufferedWriter" },
    { s: "ITEC 102", q: "Which class allows writing raw byte data to a file?", choices: ["FileOutputStream", "FileReader", "BufferedReader", "Scanner"], answer: "FileOutputStream" },
    { s: "ITEC 102", q: "Which class is used together with FileOutputStream to write primitive data types to a file?", choices: ["DataOutputStream", "FileReader", "BufferedReader", "Scanner"], answer: "DataOutputStream" },
    { s: "ITEC 102", q: "Which class provides a convenient way to write formatted text to a file?", choices: ["PrintWriter", "FileInputStream", "DataInputStream", "BufferedReader"], answer: "PrintWriter" },
    { s: "ITEC 102", q: "What does 'file searching' in a directory typically involve?", choices: ["Locating files based on criteria such as name or type", "Deleting all files permanently", "Compiling the source code", "Creating a new class"], answer: "Locating files based on criteria such as name or type" },
    { s: "ITEC 102", q: "What does searching for specific content within files involve?", choices: ["Scanning file contents to find matching text or data", "Formatting the hard drive", "Declaring new variables", "Creating a constructor"], answer: "Scanning file contents to find matching text or data" },
    { s: "ITEC 102", q: "What are command line arguments?", choices: ["Values passed to a program when it is executed from the command line", "Variables declared inside a class", "Errors found during compilation", "Files created automatically by the IDE"], answer: "Values passed to a program when it is executed from the command line" },
    { s: "ITEC 102", q: "Why are command line arguments useful?", choices: ["They allow a program to receive input without modifying its source code", "They automatically fix bugs in the program", "They compile the program faster", "They replace the need for methods"], answer: "They allow a program to receive input without modifying its source code" },
    { s: "ITEC 102", q: "Which is generally true about file reading and file writing operations?", choices: ["They both require handling the file's connection properly, such as opening and closing it", "They can never be used in the same program", "They do not require any file path", "They can only be used with arrays"], answer: "They both require handling the file's connection properly, such as opening and closing it" },
    { s: "ITEC 102", q: "What is a key reason to close a file stream after use?", choices: ["To free up system resources and ensure data is properly saved", "To automatically delete the file", "To convert the file into an array", "To create a new class from it"], answer: "To free up system resources and ensure data is properly saved" },
    { s: "ITEC 102", q: "Between FileReader and FileInputStream, which is more appropriate for reading character/text data?", choices: ["FileReader", "FileInputStream", "FileOutputStream", "DataOutputStream"], answer: "FileReader" },
    { s: "ITEC 102", q: "Between FileWriter and FileOutputStream, which is more appropriate for writing character/text data?", choices: ["FileWriter", "FileOutputStream", "FileInputStream", "DataInputStream"], answer: "FileWriter" },
    { s: "ITEC 102", q: "What is the general term for errors that occur while a program is running (not during compilation)?", choices: ["Runtime errors", "Syntax errors", "Compilation warnings", "Logic diagrams"], answer: "Runtime errors" },
    { s: "ITEC 102", q: "What is the general term for errors caused by breaking the rules of the programming language?", choices: ["Syntax errors", "Runtime errors", "Logic diagrams", "Compilation success"], answer: "Syntax errors" },
    { s: "ITEC 102", q: "What is a logic error in programming?", choices: ["An error where the program runs but produces incorrect results", "An error that prevents the program from compiling", "An error caused by hardware failure", "An error found only in arrays"], answer: "An error where the program runs but produces incorrect results" },
    { s: "ITEC 102", q: "What best describes 'scope' in programming?", choices: ["The region of code where a variable can be accessed", "The size of the hard drive", "The speed of the processor", "The color scheme of the IDE"], answer: "The region of code where a variable can be accessed" },
    { s: "ITEC 102", q: "What is the difference between a local variable and a global variable?", choices: ["A local variable is accessible only within its defined block, a global variable is accessible throughout the program", "A local variable never has a value", "A global variable cannot store numbers", "There is no difference"], answer: "A local variable is accessible only within its defined block, a global variable is accessible throughout the program" },
    { s: "ITEC 102", q: "What is the purpose of indentation and white space in coding standards?", choices: ["To make code more readable and organized", "To make the program run faster", "To reduce file size significantly", "To prevent all syntax errors"], answer: "To make code more readable and organized" },
    { s: "ITEC 102", q: "What is meant by a 'magic number' in coding, which is generally discouraged?", choices: ["An unexplained numeric value used directly in code instead of a named constant", "A number that changes the color of the screen", "A required part of every loop", "A number used only in arrays"], answer: "An unexplained numeric value used directly in code instead of a named constant" },
    { s: "ITEC 102", q: "Why are meaningful/ambiguous-free variable identifiers important?", choices: ["They make the code easier to read and understand", "They make the program compile faster", "They are required for loops to work", "They automatically fix bugs"], answer: "They make the code easier to read and understand" },
    { s: "ITEC 102", q: "What is procedural abstraction mainly about?", choices: ["Hiding the implementation details of a procedure while exposing its purpose", "Making a program run without any functions", "Removing all variables from a program", "Preventing loops from being used"], answer: "Hiding the implementation details of a procedure while exposing its purpose" },
    { s: "ITEC 102", q: "Which term refers to testing a program using different input values to check correctness?", choices: ["Test cases", "Constants", "Comments", "Class definitions"], answer: "Test cases" },
    { s: "ITEC 102", q: "Which of the following would most likely cause an endless loop?", choices: ["A loop condition that never becomes false", "A for loop with a defined end value", "A switch case with a default", "A properly initialized array"], answer: "A loop condition that never becomes false" },
    { s: "ITEC 102", q: "Which best defines efficient code according to good programming practice?", choices: ["Code that produces correct results using minimal, well-organized steps", "Code with the most lines possible", "Code with no comments", "Code that ignores user input"], answer: "Code that produces correct results using minimal, well-organized steps" },
    { s: "ITEC 102", q: "Which of the following would generally be considered part of good coding standards?", choices: ["Consistent indentation and clear variable names", "Random spacing and unclear names", "No comments at all", "Skipping program testing"], answer: "Consistent indentation and clear variable names" },
    { s: "ITEC 102", q: "Which control structure would you use to validate user input before proceeding?", choices: ["Conditional (if) statement", "Class declaration", "Constructor", "Array declaration only"], answer: "Conditional (if) statement" },
    { s: "ITEC 102", q: "What data structure would best store a list of 30 student grades of the same type?", choices: ["Array", "Single variable", "Constant", "Method"], answer: "Array" },
    { s: "ITEC 102", q: "Which of the following would you use to repeatedly prompt a user until valid input is given?", choices: ["A loop (e.g., while or do-while)", "A single if statement", "A class definition", "A constructor only"], answer: "A loop (e.g., while or do-while)" },
    { s: "ITEC 102", q: "Which best describes the relationship between a class and an object?", choices: ["A class is the blueprint, an object is an instance created from that blueprint", "An object is the blueprint, a class is an instance of it", "They are exactly the same thing", "A class can only exist without objects"], answer: "A class is the blueprint, an object is an instance created from that blueprint" },
    { s: "ITEC 102", q: "Which programming component would you use to avoid repeating the same block of code in multiple places?", choices: ["A function/method", "A constant", "A comment", "A syntax error"], answer: "A function/method" },
    { s: "ITEC 102", q: "Which of the following best describes 'parameter passing'?", choices: ["Sending values into a function or method for it to use", "Deleting a function permanently", "Compiling a class", "Declaring a constant"], answer: "Sending values into a function or method for it to use" },
    { s: "ITEC 102", q: "What is recursion in programming?", choices: ["A function calling itself to solve a smaller instance of a problem", "A loop that never runs", "A type of data type", "A file reading method"], answer: "A function calling itself to solve a smaller instance of a problem" },
    { s: "ITEC 102", q: "Why does a recursive function need a base case?", choices: ["To stop the recursive calls and prevent infinite recursion", "To make the function run faster", "To avoid declaring variables", "To skip parameter passing"], answer: "To stop the recursive calls and prevent infinite recursion" },

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

    { s: "GEC 102", q: "What is a primary source?", choices: ["A source created by participants or eyewitnesses giving firsthand information", "A summary written by a modern author", "A textbook explaining several other sources", "An encyclopedia entry"], answer: "A source created by participants or eyewitnesses giving firsthand information" },
    { s: "GEC 102", q: "Which of the following is an example of a primary source?", choices: ["Diaries and letters", "A history textbook", "A journal article reviewing an event", "An encyclopedia summary"], answer: "Diaries and letters" },
    { s: "GEC 102", q: "Which of the following is also considered a primary source?", choices: ["Oral interviews with eyewitnesses", "A biography written decades later", "A textbook chapter summary", "A bibliography of sources"], answer: "Oral interviews with eyewitnesses" },
    { s: "GEC 102", q: "What is a secondary source?", choices: ["A material written to interpret, discuss, analyze, and comment on a primary source", "An eyewitness account of an event", "An original government document", "A personal diary entry"], answer: "A material written to interpret, discuss, analyze, and comment on a primary source" },
    { s: "GEC 102", q: "Which of the following is an example of a secondary source?", choices: ["A textbook", "A diary", "An artifact", "An autobiography"], answer: "A textbook" },
    { s: "GEC 102", q: "Which of the following is also an example of a secondary source?", choices: ["A journal article", "A photograph taken during the event", "A speech given during the event", "A legal document from that time"], answer: "A journal article" },
    { s: "GEC 102", q: "Tertiary sources consist of information that is what?", choices: ["A collection of primary and secondary sources", "Only fictional stories", "Only handwritten letters", "Only government laws"], answer: "A collection of primary and secondary sources" },
    { s: "GEC 102", q: "Which of the following is an example of a tertiary source?", choices: ["An encyclopedia", "A diary entry", "A photograph", "An eyewitness interview"], answer: "An encyclopedia" },
    { s: "GEC 102", q: "Which of the following is also an example of a tertiary source?", choices: ["A bibliography", "A speech recording", "An artifact", "A letter"], answer: "A bibliography" },
    { s: "GEC 102", q: "The word 'History' came from what Greek word?", choices: ["Historia", "Historieo", "Histor", "Historicus"], answer: "Historia" },
    { s: "GEC 102", q: "What does the Greek word 'Historia' mean?", choices: ["Learning, inquiry, or investigation", "Recording numbers", "Building monuments", "Predicting the future"], answer: "Learning, inquiry, or investigation" },
    { s: "GEC 102", q: "History is a branch of what field of study?", choices: ["Social Sciences", "Natural Sciences", "Mathematics", "Fine Arts"], answer: "Social Sciences" },
    { s: "GEC 102", q: "Why is History described as a 'systematic' study?", choices: ["It follows a methodology to validate facts and evidence", "It only studies numbers", "It ignores all past events", "It is based purely on opinion"], answer: "It follows a methodology to validate facts and evidence" },
    { s: "GEC 102", q: "What does 'significant past' mean in the definition of History?", choices: ["Past events that affected the political, cultural, social, or economic aspects of society", "Any random event that happened yesterday", "Only events involving famous people", "Events that happened only in Europe"], answer: "Past events that affected the political, cultural, social, or economic aspects of society" },
    { s: "GEC 102", q: "Why is 'Juan threw a ball of paper in the trashcan' NOT considered part of Philippine History?", choices: ["It did not affect the political, cultural, social, or economic aspects of society", "It happened too recently", "It was not written in English", "It happened outside the Philippines"], answer: "It did not affect the political, cultural, social, or economic aspects of society" },
    { s: "GEC 102", q: "Why is 'History' considered a western concept with a limitation?", choices: ["It failed to account for unrecorded or unwritten sources like oral tradition", "It only focuses on modern events", "It cannot be studied by Filipinos", "It excludes all written documents"], answer: "It failed to account for unrecorded or unwritten sources like oral tradition" },
    { s: "GEC 102", q: "According to E. Kent Rogers, one reason we study History is to know more about what?", choices: ["The roots of our current culture", "The price of gold", "Modern technology trends", "Future weather patterns"], answer: "The roots of our current culture" },
    { s: "GEC 102", q: "According to E. Kent Rogers, studying History also helps us learn about what?", choices: ["Human nature by looking at trends that repeat through history", "Only mathematical formulas", "Foreign languages", "Computer programming"], answer: "Human nature by looking at trends that repeat through history" },
    { s: "GEC 102", q: "What is the main difference between 'History' and 'the Past'?", choices: ["History is the interpretation of evidence from the past in a thoughtful way, while the past is everything that has happened", "They mean exactly the same thing", "History is only about wars", "The past only refers to prehistoric times"], answer: "History is the interpretation of evidence from the past in a thoughtful way, while the past is everything that has happened" },
    { s: "GEC 102", q: "What is the main difference between 'History' and 'Prehistory'?", choices: ["The existence of written records", "The number of people involved", "The location of events", "The length of time studied"], answer: "The existence of written records" },
    { s: "GEC 102", q: "Prehistory refers to what period?", choices: ["Human activity before the invention of the writing system", "The period after World War II", "Any event before the year 2000", "The digital age"], answer: "Human activity before the invention of the writing system" },
    { s: "GEC 102", q: "How is History related to other disciplines?", choices: ["No discipline is an island; methods of studying history are influenced by other disciplines", "History has no connection to any other field", "History replaced all other disciplines", "History and other disciplines never interact"], answer: "No discipline is an island; methods of studying history are influenced by other disciplines" },
    { s: "GEC 102", q: "History is basically described as what?", choices: ["A chronology used to study and evaluate past events", "A list of famous quotes", "A prediction of future events", "A collection of myths only"], answer: "A chronology used to study and evaluate past events" },
    { s: "GEC 102", q: "What is Historicity?", choices: ["The documentation of characters in history, as opposed to legend or myth", "The writing style of a historian", "The study of future events", "A type of primary source"], answer: "The documentation of characters in history, as opposed to legend or myth" },
    { s: "GEC 102", q: "What is Historiography?", choices: ["The writing of history and how interpretations of historians change over time", "The study of prehistoric fossils", "A method of measuring time", "A tool for internal criticism"], answer: "The writing of history and how interpretations of historians change over time" },
    { s: "GEC 102", q: "What is Herstory?", choices: ["History written from a feminist perspective emphasizing the role of women", "A shortened version of history", "A history written only by men", "The history of Filipino heroes"], answer: "History written from a feminist perspective emphasizing the role of women" },
    { s: "GEC 102", q: "What does Historical Research consist of?", choices: ["Techniques and guidelines historians use to research and write histories using primary sources and evidence", "Only reading history textbooks", "Interviewing only living people", "Predicting the outcome of future elections"], answer: "Techniques and guidelines historians use to research and write histories using primary sources and evidence" },
    { s: "GEC 102", q: "What is the main purpose of Historical Research?", choices: ["To illustrate and assess events of the past, acknowledge the present, and precede possible future effects", "To create fictional stories", "To memorize dates only", "To replace textbooks with videos"], answer: "To illustrate and assess events of the past, acknowledge the present, and precede possible future effects" },
    { s: "GEC 102", q: "Why are histories described as dominant in shaping identity?", choices: ["They produce and strengthen collective identities", "They are required by law", "They are the only school subject", "They replace personal memory"], answer: "They produce and strengthen collective identities" },
    { s: "GEC 102", q: "Historical Research involves the careful study and analysis of what?", choices: ["Data about past events", "Only current events", "Future predictions", "Fictional literature"], answer: "Data about past events" },
    { s: "GEC 102", q: "Historical Research is best described as what kind of investigation?", choices: ["A critical investigation of events, their development, and experiences of the past", "A casual guess about the past", "An investigation limited to oral stories only", "A study focused only on numbers"], answer: "A critical investigation of events, their development, and experiences of the past" },
    { s: "GEC 102", q: "Aside from written materials, what else may historical research include?", choices: ["Oral documentation", "Only movies", "Only social media posts", "Only government seals"], answer: "Oral documentation" },
    { s: "GEC 102", q: "According to the Cyclical View of History, how did the Greeks see events?", choices: ["Events recurred on a regular basis", "Events never repeated", "Events were random and meaningless", "Events only happened in a straight line"], answer: "Events recurred on a regular basis" },
    { s: "GEC 102", q: "Herodotus viewed history as the story of men and states as what?", choices: ["Recurring cycles", "A single straight timeline", "God's divine plan", "A collection of myths only"], answer: "Recurring cycles" },
    { s: "GEC 102", q: "Thucydides envisioned time as recurring in what fashion?", choices: ["A cyclical fashion which men are unable to control", "A linear fashion controlled by leaders", "A random fashion with no pattern", "A digital fashion using data"], answer: "A cyclical fashion which men are unable to control" },
    { s: "GEC 102", q: "Who revived the cyclical concept of history in the 14th century?", choices: ["Petrarch", "Machiavelli", "Toynbee", "Spengler"], answer: "Petrarch" },
    { s: "GEC 102", q: "Machiavelli suggested that history could be seen as what?", choices: ["A casebook of political strategy", "A religious text", "A scientific manual", "A form of entertainment only"], answer: "A casebook of political strategy" },
    { s: "GEC 102", q: "Arnold Toynbee and Oswald Spengler based their work on the premise that history is cyclical, meaning what?", choices: ["Civilizations rise and fall, each new one rising to a greater level", "History repeats exactly the same events forever", "Only kings can shape history", "History has no pattern at all"], answer: "Civilizations rise and fall, each new one rising to a greater level" },
    { s: "GEC 102", q: "The Linear View of History views history as what?", choices: ["Progressive, moving forward and not having a cyclical return", "Repeating in endless circles", "Controlled entirely by fate", "Random and directionless"], answer: "Progressive, moving forward and not having a cyclical return" },
    { s: "GEC 102", q: "The Great God View of History associates the origin of the world with what?", choices: ["A Lord God who worked on a six-day schedule", "Natural selection", "Alien intervention", "Human invention"], answer: "A Lord God who worked on a six-day schedule" },
    { s: "GEC 102", q: "According to the Great Man View of History, what determines the course of history?", choices: ["Dominant personalities such as rulers, warriors, and statesmen", "Random natural disasters", "The weather", "Ordinary citizens only"], answer: "Dominant personalities such as rulers, warriors, and statesmen" },
    { s: "GEC 102", q: "The Best People View of History believes that history is made by whom?", choices: ["Some elite, the best race, the favored nation, or the ruling class", "Everyone equally", "Only children", "Only foreigners"], answer: "Some elite, the best race, the favored nation, or the ruling class" },
    { s: "GEC 102", q: "In the Ideas or Great Mind View of History, what is the driving force in history?", choices: ["People's ideas", "Weather patterns", "Military weapons", "Natural disasters"], answer: "People's ideas" },
    { s: "GEC 102", q: "The Human Nature View of History believes history has been determined by what?", choices: ["The qualities of human nature, whether good or bad", "Purely random chance", "Divine punishment only", "Technology alone"], answer: "The qualities of human nature, whether good or bad" },
    { s: "GEC 102", q: "Gender History looks at the past from what perspective?", choices: ["The perspective of gender", "The perspective of economics only", "The perspective of geography only", "The perspective of religion only"], answer: "The perspective of gender" },
    { s: "GEC 102", q: "The Postmodern View of History believes that history has what kind of purpose?", choices: ["No ultimate purpose", "A divine purpose only", "A purely scientific purpose", "A purpose set by one nation"], answer: "No ultimate purpose" },
    { s: "GEC 102", q: "What does External Criticism refer to?", choices: ["The genuineness or authenticity of the documents used in a historical study", "The accuracy of the content written in the document", "The number of pages in a document", "The color of the ink used"], answer: "The genuineness or authenticity of the documents used in a historical study" },
    { s: "GEC 102", q: "What does Internal Criticism refer to?", choices: ["The accuracy of the contents of the document", "The physical age of the paper", "The type of ink used", "The handwriting style only"], answer: "The accuracy of the contents of the document" },
    { s: "GEC 102", q: "Why is it important to validate historical sources through criticism?", choices: ["Because unverified or falsified sources can lead to false conclusions", "Because it makes the document heavier", "Because it changes the language of the document", "Because it is required for printing"], answer: "Because unverified or falsified sources can lead to false conclusions" },
    { s: "GEC 102", q: "An old photograph with a handwritten inscription found in a library book is what type of source?", choices: ["Primary source", "Secondary source", "Tertiary source", "Not a historical source"], answer: "Primary source" },
    { s: "GEC 102", q: "A biography of a student activist written using interviews with friends and family plus primary documents is what type of source?", choices: ["Secondary source", "Primary source", "Tertiary source", "Not a historical source"], answer: "Secondary source" },
    { s: "GEC 102", q: "A textbook that compiles works from several known historians like Agoncillo and Camagay is what type of source?", choices: ["Tertiary source", "Primary source", "Secondary source", "Not a historical source"], answer: "Tertiary source" },
    { s: "GEC 102", q: "A golden artifact like 'The Golden Tara' displayed in a museum, believed to be made before Spanish colonization, is what type of source?", choices: ["Primary source", "Secondary source", "Tertiary source", "Not a historical source"], answer: "Primary source" },
    { s: "GEC 102", q: "A travel brochure produced by a tourism office with basic historical information about a place is what type of source?", choices: ["Tertiary source", "Primary source", "Secondary source", "Not a historical source"], answer: "Tertiary source" },
    { s: "GEC 102", q: "What is Content Analysis?", choices: ["A research method for studying documents and communication artifacts", "A method for repairing old documents", "A way to translate documents into other languages", "A method for printing documents"], answer: "A research method for studying documents and communication artifacts" },
    { s: "GEC 102", q: "According to Klaus Krippendorff, content analysis must address which data are what?", choices: ["Analyzed", "Destroyed", "Copied", "Translated"], answer: "Analyzed" },
    { s: "GEC 102", q: "According to Krippendorff, one item that must be addressed in content analysis is: how are the data what?", choices: ["Defined", "Erased", "Sold", "Hidden"], answer: "Defined" },
    { s: "GEC 102", q: "According to Krippendorff, content analysis must also identify what?", choices: ["From what population the data is drawn", "The price of the material", "The author's nationality only", "The publisher's address"], answer: "From what population the data is drawn" },
    { s: "GEC 102", q: "According to Krippendorff, content analysis must determine what is relevant?", choices: ["Context", "Currency", "Weather", "Location of storage"], answer: "Context" },
    { s: "GEC 102", q: "According to Krippendorff, content analysis must define the boundaries of what?", choices: ["The Analysis", "The library", "The classroom", "The internet"], answer: "The Analysis" },
    { s: "GEC 102", q: "According to Krippendorff, content analysis must decide what is to be what?", choices: ["Measured", "Destroyed", "Ignored", "Sold"], answer: "Measured" },
    { s: "GEC 102", q: "Which of the following is one of the five kinds of text in content analysis?", choices: ["Written text, such as books and papers", "Digital currency", "Musical instruments", "Physical exercise routines"], answer: "Written text, such as books and papers" },
    { s: "GEC 102", q: "Oral text in content analysis refers to what?", choices: ["Speech and theatrical performance", "Written books only", "Paintings and drawings", "Internet websites only"], answer: "Speech and theatrical performance" },
    { s: "GEC 102", q: "Iconic text in content analysis includes what?", choices: ["Drawings, paintings, and icons", "Only spoken speeches", "Only television shows", "Only handwritten letters"], answer: "Drawings, paintings, and icons" },
    { s: "GEC 102", q: "Audio-visual text in content analysis includes what?", choices: ["TV programs, movies, and videos", "Only ancient scrolls", "Only oral speeches", "Only maps"], answer: "TV programs, movies, and videos" },
    { s: "GEC 102", q: "Hypertexts in content analysis refer to what?", choices: ["Text found on the Internet", "Only printed books", "Only handwritten diaries", "Only stone carvings"], answer: "Text found on the Internet" },
    { s: "GEC 102", q: "What does Conceptual Analysis help establish?", choices: ["The existence and frequency of concepts in the text", "The price of the document", "The physical weight of a book", "The color of the ink"], answer: "The existence and frequency of concepts in the text" },
    { s: "GEC 102", q: "What does Relational Analysis examine?", choices: ["The relationship among concepts in the text", "The location where the text was printed", "The number of pages in a book", "The author's birthday"], answer: "The relationship among concepts in the text" },
    { s: "GEC 102", q: "What is Contextual Analysis?", choices: ["An analysis that assesses a text within its historical and cultural setting", "A method of translating a text", "A way to count words in a text", "A method to destroy fake documents"], answer: "An analysis that assesses a text within its historical and cultural setting" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks what the text reveals about itself, referring to what?", choices: ["Description of the language and arrangement of words", "The price of publishing", "The weight of the paper", "The type of printer used"], answer: "Description of the language and arrangement of words" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks about the text's apparent intended audience, referring to what?", choices: ["Kinds and number of audience", "The author's income", "The publisher's logo", "The size of the font"], answer: "Kinds and number of audience" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks about the author's intention, referring to what?", choices: ["What the author said or did not say, and how he said it", "The author's favorite color", "The author's birthday", "The author's home address"], answer: "What the author said or did not say, and how he said it" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks about the occasion for the text, referring to what?", choices: ["A particular event or the author's general observation about it", "The number of pages printed", "The cost of ink used", "The size of the book cover"], answer: "A particular event or the author's general observation about it" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks whether the text is intended as what?", choices: ["A call to-or for-action", "A form of currency", "A type of artifact", "A government seal"], answer: "A call to-or for-action" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks about non-textual circumstances, which may include what?", choices: ["Political events, economic factors, and cultural practices", "The font size used", "The type of paper used", "The number of copies printed"], answer: "Political events, economic factors, and cultural practices" },
    { s: "GEC 102", q: "What does the Subtext of a document refer to?", choices: ["Its secondary and implied meanings", "Its exact word count", "Its physical size", "Its publication date only"], answer: "Its secondary and implied meanings" },
    { s: "GEC 102", q: "What is Historical Significance?", choices: ["The process used to evaluate the importance of selected events, people, and developments in the past", "The exact number of pages in a history book", "A rule that only applies to wars", "A grading system for exams only"], answer: "The process used to evaluate the importance of selected events, people, and developments in the past" },
    { s: "GEC 102", q: "The Relevance criterion in assessing historical significance asks what?", choices: ["Is it necessary or relevant to people living in the time, or still relevant today?", "How many pages does it have?", "What color is the document?", "Who printed the document?"], answer: "Is it necessary or relevant to people living in the time, or still relevant today?" },
    { s: "GEC 102", q: "The Resonance criterion in assessing historical significance asks about what?", choices: ["Who was affected by the event and why it was necessary for them", "The price of the artifact", "The size of the museum", "The type of paper used"], answer: "Who was affected by the event and why it was necessary for them" },
    { s: "GEC 102", q: "The Remarkable criterion in assessing historical significance asks what?", choices: ["Was the event remarked on by people at the time or since?", "Was the event colorful?", "Was the event expensive?", "Was the event short?"], answer: "Was the event remarked on by people at the time or since?" },
    { s: "GEC 102", q: "The Remembered criterion in assessing historical significance asks what?", choices: ["Was the event significant within the collective memory of a group?", "Was the event forgotten immediately?", "Was the event never recorded?", "Was the event fictional?"], answer: "Was the event significant within the collective memory of a group?" },
    { s: "GEC 102", q: "The Revealing criterion in assessing historical significance asks what?", choices: ["Does it reveal some other aspects of the past?", "Does it hide all information?", "Does it cost a lot of money?", "Does it require translation?"], answer: "Does it reveal some other aspects of the past?" },
    { s: "GEC 102", q: "The Resulting in Change criterion in assessing historical significance asks what?", choices: ["Does it have consequences for the future?", "Does it require government approval?", "Does it need to be translated?", "Does it need a new printing press?"], answer: "Does it have consequences for the future?" },
    { s: "GEC 102", q: "The Durability criterion in assessing historical significance asks what?", choices: ["For how long have the people's lives been affected?", "How heavy is the document?", "How much did it cost to produce?", "How many colors are used?"], answer: "For how long have the people's lives been affected?" },
    { s: "GEC 102", q: "The Quantity criterion in assessing historical significance asks what?", choices: ["How many people were affected by the event?", "How many pages does the book have?", "How many photos were taken?", "How many years did research take?"], answer: "How many people were affected by the event?" },
    { s: "GEC 102", q: "The Profundity criterion in assessing historical significance asks what?", choices: ["Was the event superficial or deeply affecting?", "Was the event expensive to record?", "Was the event well-photographed?", "Was the event quickly forgotten?"], answer: "Was the event superficial or deeply affecting?" },
    { s: "GEC 102", q: "If an author wants you to believe, do, or buy something, what is the author's purpose?", choices: ["To persuade", "To inform", "To entertain", "To describe"], answer: "To persuade" },
    { s: "GEC 102", q: "If an author wants to give you information or instructions, what is the author's purpose?", choices: ["To inform", "To entertain", "To persuade", "To narrate"], answer: "To inform" },
    { s: "GEC 102", q: "If an author wants to relate a story or recount past events, what is the author's purpose?", choices: ["To narrate or recount", "To explain", "To describe", "To persuade"], answer: "To narrate or recount" },
    { s: "GEC 102", q: "If an author wants you to visualize or experience what something looks, sounds, or feels like, what is the author's purpose?", choices: ["To describe", "To inform", "To persuade", "To narrate"], answer: "To describe" },
    { s: "GEC 102", q: "If an author wants to tell you how to do something or how something works, what is the author's purpose?", choices: ["To explain", "To entertain", "To persuade", "To describe"], answer: "To explain" },
    { s: "GEC 102", q: "If an author wants to amuse you or for you to enjoy the writing itself, what is the author's purpose?", choices: ["To entertain", "To inform", "To persuade", "To explain"], answer: "To entertain" },
    { s: "GEC 102", q: "What is the first step in identifying the author's purpose?", choices: ["Ask, 'Why did the author create or write this text?'", "Check the price of the book", "Count the number of pages", "Look at the book's color"], answer: "Ask, 'Why did the author create or write this text?'" },
    { s: "GEC 102", q: "If the author's purpose isn't obvious, what should you ask?", choices: ["'How did this make me feel?'", "'How much did this cost?'", "'Who printed this book?'", "'What font was used?'"], answer: "'How did this make me feel?'" },
    { s: "GEC 102", q: "Which clue words show that the author wants to Compare ideas?", choices: ["Both, similarly, in the same way, like, just as", "However, but, on the other hand", "Additional details, superlative adjectives", "Judgment words showing negative opinion"], answer: "Both, similarly, in the same way, like, just as" },
    { s: "GEC 102", q: "Which clue words show that the author wants to Contrast ideas?", choices: ["However, but, dissimilarly, on the other hand", "Both, similarly, just as", "Positive opinions proving a point", "Words that simplify a process"], answer: "However, but, dissimilarly, on the other hand" },
    { s: "GEC 102", q: "If a text contains judgment words that show a negative opinion, what is the author's purpose?", choices: ["To criticize", "To describe", "To compare", "To suggest"], answer: "To criticize" },
    { s: "GEC 102", q: "If a text uses additional details and superlative adjectives, what is the author trying to do?", choices: ["Intensify an idea", "Compare two ideas", "Contrast two ideas", "List ideas without opinion"], answer: "Intensify an idea" },
    { s: "GEC 102", q: "If a text uses positive opinions to prove a point, what is the author's purpose?", choices: ["To suggest an idea", "To criticize an idea", "To contrast ideas", "To identify a list only"], answer: "To suggest an idea" },

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
    milestonesHit: new Set(),
    /* NEW FEATURE: Boss Question state */
    bossQuestionActive: false,
    bossHit: new Set(),
    activeTimeLimit: QUESTION_TIME_LIMIT,
    /* NEW FEATURE: sound mute toggle */
    muted: false
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
    // Strict validation: letters and spaces only — no numbers, symbols, or emojis.
    return raw
      .replace(/[^a-zA-Z ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 22);
  }

  function usernameKey(name) {
    return String(name || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z_]/g, "")
      .slice(0, 22);
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

  /* ============ NEW FEATURE: 🏅 Dynamic Academic Badges / Ranks ============
     Rank title changes every 10 points, all the way up to the 500-point
     Valedictorian cap. Checked top-down via .find() — no lag, no switch
     statement needed. */
  const RANK_TABLE = [
    { min: 500, tier: "LEGEND", title: "BSCS 1-A Valedictorian \u{1F393}" },
    { min: 450, tier: "GOD MODE", title: "Cyber Dean's Lister \u{1F451}" },
    { min: 400, tier: "EXPERT", title: "Full-Stack Wizard \u{1F52E}" },
    { min: 300, tier: "EXPERT", title: "AI Prompt Engineer \u{1F9D9}\u200D\u2642\uFE0F" },
    { min: 250, tier: "SENIOR", title: "Database Manipulator \u{1F5C4}\uFE0F" },
    { min: 200, tier: "SENIOR", title: "Spaghetti Code Chef \u{1F35D}" },
    { min: 150, tier: "JUNIOR", title: "Pointer Survivor \u{1F4CD}" },
    { min: 100, tier: "JUNIOR", title: "OOP Architect \u{1F3DB}\uFE0F" },
    { min: 50, tier: "JUNIOR", title: "Array Master \u{1F522}" },
    { min: 40, tier: "SOPHOMORE", title: "StackOverflow Plagiarist \u{1F4DA}" },
    { min: 30, tier: "SOPHOMORE", title: "Git Commit Spammer \u{1F680}" },
    { min: 20, tier: "FRESHMAN", title: "Compiler Bully \u{1F916}" },
    { min: 10, tier: "FRESHMAN", title: "Syntax Error Enjoyer \u{1F41B}" },
    { min: 0, tier: "FRESHMAN", title: "Hello World Installer \u{1F9D1}\u200D\u{1F4BB}" }
  ];

  function getRankEntry(score) {
    const safeScore = Math.max(0, Number(score) || 0);
    return RANK_TABLE.find((entry) => safeScore >= entry.min) || RANK_TABLE[RANK_TABLE.length - 1];
  }

  function getRank(score) {
    const entry = getRankEntry(score);
    return `[${entry.tier}] ${entry.title}`;
  }

  /* ============ NEW FEATURE: 🔊 Retro Web Audio FX (no MP3s) ============
     One shared AudioContext, three tiny OscillatorNode-based chiptune FX.
     Everything routes through playTone()/isSoundBlocked() so the mute
     toggle silences all of it instantly with zero extra checks elsewhere. */
  let sharedAudioCtx = null;

  function getAudioCtx() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
      if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
      return sharedAudioCtx;
    } catch (error) {
      console.warn("[Arena] Web Audio unavailable:", error);
      return null;
    }
  }

  function isSoundBlocked() {
    return state.muted;
  }

  function playTone(ctx, freq, startAt, duration, type, gainLevel) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(gainLevel != null ? gainLevel : 0.07, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
    return osc;
  }

  // Quick high 8-bit "beep" — correct answer.
  function playCorrectBeep() {
    if (isSoundBlocked()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      playTone(ctx, 880, now, 0.09, "square", 0.06);
      playTone(ctx, 1320, now + 0.08, 0.12, "square", 0.06);
    } catch (error) {
      console.warn("[Arena] Correct-beep skipped:", error);
    }
  }

  // Short descending glitch/buzz — wrong answer or timeout.
  function playWrongBuzz() {
    if (isSoundBlocked()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.28);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch (error) {
      console.warn("[Arena] Wrong-buzz skipped:", error);
    }
  }

  // Short digital victory fanfare — every 25-score milestone (and graduation win).
  function playFanfare(big) {
    if (isSoundBlocked()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = big
        ? [523.25, 659.25, 783.99, 1046.5]
        : [659.25, 830.61, 987.77];
      notes.forEach((freq, i) => {
        playTone(ctx, freq, now + i * 0.12, 0.16, "triangle", 0.065);
      });
    } catch (error) {
      console.warn("[Arena] Fanfare skipped:", error);
    }
  }

  function loadMutePreference() {
    try {
      return window.localStorage.getItem(SOUND_MUTE_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function saveMutePreference(muted) {
    try {
      window.localStorage.setItem(SOUND_MUTE_KEY, muted ? "1" : "0");
    } catch (error) {
      /* ignore — storage may be unavailable (private mode, etc.) */
    }
  }

  function applyMuteButtonState() {
    if (!elements || !elements.muteToggleBtn) return;
    elements.muteToggleBtn.textContent = state.muted ? "\u{1F507}" : "\u{1F50A}";
    elements.muteToggleBtn.classList.toggle("is-muted", state.muted);
    elements.muteToggleBtn.setAttribute("aria-pressed", state.muted ? "true" : "false");
  }

  function toggleMute() {
    state.muted = !state.muted;
    saveMutePreference(state.muted);
    applyMuteButtonState();
    if (!state.muted) {
      // Little confirmation blip so the player knows sound is back on.
      playCorrectBeep();
    }
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
      lbTitle: $("lbTitle"),
      muteToggleBtn: $("muteToggleBtn")
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

    state.muted = loadMutePreference();
    applyMuteButtonState();
    bindTap(elements.muteToggleBtn, (event) => {
      event.preventDefault();
      toggleMute();
    });

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

    // Live-clean the field as the user types: letters and spaces only.
    elements.usernameInput.addEventListener("input", () => {
      const cursorAtEnd = elements.usernameInput.selectionEnd === elements.usernameInput.value.length;
      const cleaned = elements.usernameInput.value.replace(/[^a-zA-Z ]/g, "").slice(0, 22);
      if (cleaned !== elements.usernameInput.value) {
        elements.usernameInput.value = cleaned;
        if (cursorAtEnd) {
          elements.usernameInput.setSelectionRange(cleaned.length, cleaned.length);
        }
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
    // Skipping a Boss Question ends that encounter — no free re-roll of it.
    state.bossQuestionActive = false;
    setBossVisuals(false);
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
    // NEW FEATURE: Boss Questions run on a slashed 15s clock instead of 25s.
    state.activeTimeLimit = state.bossQuestionActive ? BOSS_TIME_LIMIT : QUESTION_TIME_LIMIT;
    state.timer = state.activeTimeLimit;
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
    const limit = state.activeTimeLimit || QUESTION_TIME_LIMIT;
    const pct = Math.max(0, (state.timer / limit) * 100);
    elements.timerBarFill.style.width = `${pct}%`;
    elements.timerNum.textContent = String(Math.max(0, state.timer));

    let color = "#64ffda";
    if (pct <= 60 && pct > 30) color = "#ffe066";
    if (pct <= 30) color = "#ff6b6b";
    elements.timerBarFill.style.background = color;
  }

  function handleTimeout() {
    if (state.locked || !state.currentQuestion) return;
    playWrongBuzz();
    state.mistakes.push({
      subject: state.currentQuestion.s,
      q: state.currentQuestion.q,
      chosen: "(Walang sagot \u2014 naubos ang oras)",
      correct: state.currentQuestion.answer
    });
    disableChoices(state.currentQuestion.answer);
    state.streak = 0;
    // Boss Question timing out still counts as a normal miss (no bonus/penalty change).
    state.bossQuestionActive = false;
    setBossVisuals(false);
    loseLife("timeout");
  }

  /* ---------------- Question flow ---------------- */
  function buildPool() {
    state.activePool = shuffle(questionBank);
    state.currentIndex = 0;
  }

  // NEW FEATURE: Boss Question pool — hardest subject only (ITEC 102).
  const bossQuestionPool = questionBank.filter((item) => item.s === BOSS_SUBJECT);

  function getBossQuestion() {
    if (!bossQuestionPool.length) return null;
    return bossQuestionPool[Math.floor(Math.random() * bossQuestionPool.length)];
  }

  // Toggles the red boss-mode visuals on the subject chip, stream label, and arena border.
  function setBossVisuals(active) {
    document.body.classList.toggle("boss-active", !!active);
    if (elements.subjectChip) elements.subjectChip.classList.toggle("boss-chip", !!active);
    const streamChip = document.querySelector(".stream-chip");
    if (streamChip) streamChip.classList.toggle("boss-stream", !!active);
  }

  function loadNextQuestion() {
    if (state.ending || state.sessionLocked) return;

    let question = null;

    // NEW FEATURE: if a Boss Question was just triggered, force-pull it
    // from the hardest subject pool instead of the normal shuffled pool.
    if (state.bossQuestionActive) {
      question = getBossQuestion();
    }

    if (!question) {
      state.bossQuestionActive = false;
      setBossVisuals(false);
      if (state.currentIndex >= state.activePool.length) {
        buildPool();
      }
      question = state.activePool[state.currentIndex];
      state.currentIndex += 1;
    }

    state.currentQuestion = question;
    state.locked = false;
    state.hiddenChoices = new Set();
    state.hasUsed5050 = false;
    state.hasUsedSkip = false;
    if (elements.fiftyBtn) elements.fiftyBtn.disabled = false;
    if (elements.skipBtn) elements.skipBtn.disabled = false;

    setBossVisuals(state.bossQuestionActive);
    elements.subjectChip.textContent = state.bossQuestionActive
      ? `\u2694\uFE0F BOSS: ${question.s}`
      : question.s;
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

    // NEW FEATURE: Boss Questions were flagged when this question loaded —
    // capture that now, before any state gets reset below.
    const wasBossQuestion = state.bossQuestionActive;

    if (correct) {
      btnEl.classList.add("correct");
      state.streak += 1;
      let gained;
      if (wasBossQuestion) {
        // Boss Question correct answer: flat DOUBLE points, no streak stacking.
        gained = BOSS_SCORE_PER_CORRECT;
      } else {
        gained = SCORE_PER_CORRECT;
        if (state.streak > 0 && state.streak % STREAK_TARGET === 0) {
          gained += STREAK_BONUS;
        }
      }
      const oldScore = state.score;
      state.score += gained;
      playCorrectBeep();

      if (wasBossQuestion) {
        state.bossQuestionActive = false;
        setBossVisuals(false);
        elements.feedback.textContent = `\u2694\uFE0F BOSS DEFEATED! +${gained} points (DOUBLE) \u00b7 Keep going, Scholar!`;
        elements.feedback.className = "feedback is-boss-win";
      } else {
        elements.feedback.textContent = `Correct! +${gained} points \u00b7 Streak ${state.streak}`;
        elements.feedback.className = "feedback";
      }
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
        playFanfare(false);
        showMilestoneOverlay(milestone, () => {
          // NEW FEATURE: some checkpoints are also Boss Question triggers.
          if (BOSS_THRESHOLDS.includes(milestone) && !state.bossHit.has(milestone)) {
            state.bossHit.add(milestone);
            window.setTimeout(() => triggerBossSequence(), 200);
          } else {
            window.setTimeout(loadNextQuestion, 250);
          }
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
      playWrongBuzz();
      // Boss Question wrong answer: normal -1 heart, no extra penalty.
      state.bossQuestionActive = false;
      setBossVisuals(false);
      elements.feedback.textContent = wasBossQuestion
        ? "Boss question \u2014 mali. Isang heart lang ang nabawas."
        : "Mali. Isang heart ang nabawas.";
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

  /* ---------------- ⚔️ NEW FEATURE: Boss Question subject-hack ---------------- */
  function triggerBossSequence() {
    if (state.ending || state.sessionLocked) return;
    playWrongBuzz();

    const flashOverlay = document.createElement("div");
    flashOverlay.className = "boss-flash-overlay";
    const flashText = document.createElement("div");
    flashText.className = "boss-flash-text";
    flashText.innerHTML =
      "<span>\u26A0\uFE0F BOSS LEVEL WARNING! \u26A0\uFE0F</span>" +
      "<small>SUBJECT HACK DETECTED \u2014 ITEC 102 INCOMING \u2014 15s CLOCK</small>";
    document.body.appendChild(flashOverlay);
    document.body.appendChild(flashText);

    window.setTimeout(() => {
      flashOverlay.remove();
      flashText.remove();
      state.bossQuestionActive = true;
      loadNextQuestion();
    }, BOSS_FLASH_DURATION_MS);
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
    // NEW FEATURE: reset Boss Question state for a fresh run.
    state.bossQuestionActive = false;
    state.bossHit = new Set();
    state.activeTimeLimit = QUESTION_TIME_LIMIT;
    setBossVisuals(false);
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
    const key = usernameKey(state.username);
    const entry = {
      username: state.username,
      score: state.score,
      badge: getRank(state.score),
      avatar: state.avatar,
      ts: Date.now(),
      scoreVersion: SCORE_MIGRATION_VERSION
    };

    if (db && key) {
      try {
        const entryRef = ref(db, `${FIREBASE_TABLE}/${key}`);
        const snap = await get(entryRef);
        if (snap.exists() && Number(snap.val().score || 0) >= state.score) {
          // Existing high score is already equal or better — don't overwrite it.
          return;
        }
        await set(entryRef, entry);
        return;
      } catch (error) {
        console.warn("[Arena] Firebase write failed, saving locally instead:", error);
      }
    }

    const list = await fetchScores();
    const idx = list.findIndex((item) => usernameKey(item.username) === key);
    if (idx >= 0) {
      if (Number(list[idx].score || 0) < state.score) list[idx] = entry;
    } else {
      list.push(entry);
    }
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

  // Graduation win (500) reuses the shared retro sound engine's big fanfare,
  // and correctly respects the mute toggle.
  function playVictoryFanfare() {
    playFanfare(true);
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
    state.bossQuestionActive = false;
    setBossVisuals(false);
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
    state.bossQuestionActive = false;
    setBossVisuals(false);
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
