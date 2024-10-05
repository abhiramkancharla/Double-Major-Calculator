const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');

let ceURL = "https://catalog.ncsu.edu/undergraduate/engineering/electrical-computer/computer-engineering-bs/#semestersequencetext"; // INPUT should be in this format
let meURL = "https://catalog.ncsu.edu/undergraduate/engineering/mechanical-aerospace/mechanical-engineering-bs/#semestersequencetext";
const numbers = [1,2,3,4,5,6,7,8,9,0];

const avgClassesPerSemester = 6;
const avgClassesPerDegree = avgClassesPerSemester * 8;

const endLoopAt = "GEP Requirement"; // Last possible value that's counted that does not involve elective courses
const endLoopAtAccurate = "GEP Humanities"; // ^More accurate

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// method: @findNum()
// Used to find a string num into an int num
function findNum(stringNum) {

    for (let i = 0; i < numbers.length; i++) {
        if (stringNum == numbers[i]) {
            return numbers[i];
        }
    }
}

// method: @separateClasses()
// Used to seperate class related hyperlink from others.
function separateClasses(data) {
    var classes = [];

    function isCompatible(text) {
        const textData = text.split("");
        const capitalLetterThreshold = 1;

        var isClass = false;
        var capitalLetterProportion = 0;
        var capitalLetters = 0;
        var totalLetters = 0;
        var containsNumbers = false;

        // If there are numbers/full caps in the string
        for (let i = 0; i < textData.length; i++) {
            if (findNum(textData[i])) {
                containsNumbers = true;
            } else if (typeof(textData[i]) == typeof("Hello")) {
                totalLetters += 1;

                if (textData[i].toUpperCase() == textData[i]) {
                    capitalLetters += 1;
                }
            } 
        }

        capitalLetterProportion = (capitalLetters/totalLetters);
        if (capitalLetterProportion == capitalLetterThreshold && containsNumbers == true) {
            isClass = true;
        }

        return isClass;
    }

    for (let i = 0; i < data.length; i++) {
        if (data[i] == endLoopAtAccurate) { // To avoid counting electives
            break
        }
        if (isCompatible(data[i]) == true) {
            classes.push(data[i]);
        }
    }

    return classes

}

// method: @scrapeWebsite
// Used to get all the <a> (anchor) tags from the website as they are hyperlinked to courses.
async function scrapeWebsite(url) {

    const {data} = await axios.get(url);

    // Parsing the data
    const parsedData = cheerio.load(data);
    
    const allHyperlinks = [];

    parsedData("a").each((i, element) => {
        const anchor = parsedData(element).text();
        allHyperlinks.push(anchor);
    });

    var evalutedClasses = separateClasses(allHyperlinks);
    
    return evalutedClasses;
}

async function findCommonClasses(url1, url2) {

    var ceClassess = await scrapeWebsite(url1);
    var meClassess = await scrapeWebsite(url2);
    var commonClasses = [];

    var biggerMajor;
    var smallerMajor;

    var biggerMajorCredits;
    var smallerMajorCredits;

    function isAlreadyCounted(course) {

        for (let i = 0; i < commonClasses.length; i++) {
            if (course == commonClasses[i]) {
                return true;
            }
        }

        return false;
    }

    if (ceClassess.length > meClassess.length) {
        biggerMajor = ceClassess;
        smallerMajor = meClassess;
    } else {
        biggerMajor = meClassess;
        smallerMajor = ceClassess;
    }

    biggerMajorCredits = biggerMajor;
    smallerMajorCredits = smallerMajor;

    for (let i = 0; i < biggerMajor.length; i++) {
        for (let i2 = 0; i2 < smallerMajor.length; i2++) {
            if (biggerMajor[i] == smallerMajor[i2]) {

                if (isAlreadyCounted(smallerMajor[i2]) == false) {
                    commonClasses.push(smallerMajor[i2]);
                }
                
                //  - no use delete later (if not possible)
                if (biggerMajorCredits[i] > -1) {
                    biggerMajorCredits.splice(i);
                }
                if (smallerMajorCredits[i2] > -1) {
                    smallerMajorCredits.splice(i2);
                }
            }
        }
    }

    return [commonClasses, biggerMajorCredits, smallerMajorCredits];
}

async function main() {
   // var commonClasses, biggerMajorCredits, smallerMajorCredits = await findCommonClasses(ceURL, meURL);

    var courseData = await findCommonClasses(ceURL, meURL);
    var commonClasses = courseData[0];
  //  var biggerMajorCredits = courseData[1];
   // var smallerMajorCredits = courseData[2]; // biggermajor and smallermajor invalid as they are counting all electives as required courses as well
    // count only the first non elective courses

    var remainingClasses = avgClassesPerDegree - commonClasses.length;

    console.log("You have " + commonClasses.length + " classes in common between both your majors");
    console.log(commonClasses);

    console.log("You have to complete roughly " + remainingClasses + " more classess additionally");

}

// method: @findMajor()
// Used to get the link of the semester sequence from the client
// Initiates the `main` method
function takeMajorInput() {

    function begin() {
        main();
    }

    function next() {
        rl.question("Provide a link to your second choice major's semester sequence ", (input) => {
            meURL = input;
            
            if (meURL && ceURL) {
                begin();
            } else {
                console.log("You must have an input!");
            }
            rl.close();
        });
    }

    rl.question("Provide a link to your first choice major's semester sequence ", (input) => {
        ceURL = input;

        next();
    });

}

takeMajorInput();