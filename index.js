
// Web app's Firebase configuration
var firebaseConfig = {
    //hidden information
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

// Get a reference to the database service
var database = firebase.database();
var usersRef = database.ref('Users');
var uName;

var numUsers;
//non-function methods
usersRef.on("child_added", function(snapshot){
    numUsers = snapshot.numChildren();
});

// Activates buttons when hitting "enter" after typing in information into text boxes
var pwEnter = document.getElementById("login_password_field");
var confirmEnter = document.getElementById("register_password_field_confirm");

try{
    pwEnter.addEventListener("keyup", function(event){
        if(event.keyCode == 13){
            event.preventDefault();
            document.getElementById("loginbtn").click();
        }
    });
    confirmEnter.addEventListener("keyup", function(event){
        if(event.keyCode == 13){
            event.preventDefault();
            document.getElementById("registerbtn").click();
        }
    });
}catch(e){
    console.log("not loading 'enter' event listeners for login and register");
}


/////////////// REGISTER FUNCTION //////////////////////////////////

function register(){
    var userEmail = document.getElementById("register_email_field").value;                      // get email from html
    var userPassword = document.getElementById("register_password_field").value;                // get password from html
    var userPasswordConfirm = document.getElementById("register_password_field_confirm").value; // get confirmed password from html

    console.log("in register()");
    if(userPassword.localeCompare(userPasswordConfirm) == 0){   // if passwords match:
        firebase.auth().createUserWithEmailAndPassword(userEmail,userPassword).catch(function(error) { // create user with
            // Handle Errors here.                                                                     // respective information
            var errorCode = error.code;
            var errorMessage = error.message;

            window.alert("Error : " + errorMessage);
        });
        var user = firebase.auth().currentUser; // authorize current user

        var userName = userEmail.split('@')[0]; // get username to create character stats and add to database
        firebase.auth().onAuthStateChanged(function(user){
            if(user){
                console.log("User is logged in");
                console.log("Pushing default stats...");
                database.ref('Users/' + userName).set({
                    exp: 1.0,
                    health: 250.0,
                    critical: 5.0,
                    avgDmg: 10.0,
                    numWins: 0,
                    numLosses: 0,
                    level: 1
                });
                console.log("Pushed stats successfully!")
                var currentUserRef = database.ref('Users/'+userName);
                uName = userName;
                window.location = 'index.html';
            }
            else{
                console.log("User is not logged in");
            }
        });
    }
}

/////////////// LOGIN FUNCTION //////////////////////////////////

function login(){
    var userEmail = document.getElementById("login_email_field").value;
    var userPassword = document.getElementById("login_password_field").value;

    var userName = userEmail.split('@')[0];
    //window.alert("in login()");
    firebase.auth().signInWithEmailAndPassword(userEmail, userPassword).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        window.alert("Error : " + errorMessage);
    });
    firebase.auth().onAuthStateChanged(function(user){
        if(user){
            var curUser = database.ref('Users/'+userName);
            uName = userName;
            console.log("User is logged in");
            window.location = "index.html";
            document.getElementById("index-div").style.display = "block";
            document.getElementById("stats-div").style.display = "none";
            updateStats(curUser);
        }
        else{
            console.log("User is not logged in");
        }
    });
}

function logout(){
    //window.alert("in logout()");
    firebase.auth().signOut();
    window.location = 'login.html';
}

function fight(){
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // This snippet of code gets the username of the current user to modify stats during the fight.
var user = firebase.auth().currentUser;
var email;
if(user != null){
    email = user.email;
}
var userName = email.split('@')[0];

    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // This snippet of code gets the username of the opponent to modify stats during the fight.
var oppName = userName;
while(oppName.localeCompare(userName) == 0){    // while loop to avoid opponent being the same as the user
    var randomIndex = Math.floor((Math.random() * numUsers) + 1);
    console.log("Chose user # " + randomIndex + " out of " + numUsers + " users in the database.");
    var count = 1;
    for(var i = 0; i < numUsers; i++){          //https://stackoverflow.com/questions/45038040/how-to-iterate-over-firebase-data-object-to-list
        usersRef.on('value', function(snap){
            snap.forEach(function(childNodes){
                if(randomIndex == count){
                    oppName = childNodes.key;   // string oppName = the name of the ID which carries stats such as health, etc.
                    //window.alert(oppName);
                }
                count++; // increment count st. we only allow oppName to be set if we hit the randomly generated index
            });
        });
    }
}
console.log("User name is : " + userName);
console.log("Opponent name is : " + oppName);
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // This snippet of code is the fight between current user and opponent
var p1Ref = database.ref('Users/'+userName);
var p2Ref = database.ref('Users/'+oppName);

// fight begins
var damage;
var hp1 = getFighterHealth(p1Ref);
var hp2 = getFighterHealth(p2Ref);

console.log("Starting health: p1: "+hp1 + " p2: "+hp2);

var turn = getRandomInt(2);     // randomly decide which player gets first hit (to make fair combat system)
while(hp1 > 0.0 && hp2 > 0.0){
    switch(turn){
        case 0: damage = getHitDamage(getFighterAvgDmg(p1Ref), getFighterCrit(p1Ref));
                hp2 = hp2 - damage;     // do damage on opponent
                turn = 1;               // set turn to opponent
                break;
        case 1: damage = getHitDamage(getFighterAvgDmg(p2Ref), getFighterCrit(p2Ref));
                hp1 = hp1 - damage;     // do damage on user
                turn = 0;               // set turn to user
                console.log("hp1 = " + hp1);
                break;
        default: break;
    }
    if(hp2 <= 0.0){
        hp2 = 0.0; // Enemy is defeated
        console.log("Opponent is defeated! User has won!");
        document.getElementById("win-result").innerHTML = "You were victorious!";
        document.getElementById("loss-result").innerHTML = "";
        addExperience(p1Ref, true);
        addExperience(p2Ref, false);
    }
    if(hp1 <= 0.0){
        hp1 = 0.0; // User is defeated
        console.log("User is defeated! Opponent has won!");
        document.getElementById("loss-result").innerHTML = "You lost!";
        document.getElementById("win-result").innerHTML = "";
        addExperience(p2Ref, true);
        addExperience(p1Ref, false);
    }
}
updateStats(p1Ref);
}

// GETTERS //////////////////////////////////////////////////////////////////////
function getFighterHealth(e){
    var hp;
    e.on('value',function(snap){
        snap.forEach(function(childNodes){
            if(childNodes.key == "health"){
                hp = childNodes.val();
            }
        });
    });
    return hp;
}
function getFighterCrit(e){
    var crit;
    e.on('value',function(snap){
        snap.forEach(function(childNodes){
            if(childNodes.key == "critical"){
                crit = childNodes.val();
            }
        });
    });
    return crit;
}
function getFighterAvgDmg(e){
    var avgDmg;
    e.on('value',function(snap){
        snap.forEach(function(childNodes){
            if(childNodes.key == "avgDmg"){
                avgDmg = childNodes.val();
            }
        });
    });
    return avgDmg;
}
function getFighterExp(e){
    var exp;
    e.on('value',function(snap){
        snap.forEach(function(childNodes){
            if(childNodes.key == "exp"){
                exp = childNodes.val();
            }
        });
    });
    return exp;
}

function getNumWins(e){
    var wins;
    e.on('value',function(snap){
        snap.forEach(function(childNodes){
            if(childNodes.key == "numWins"){
                wins = childNodes.val();
            }
        });
    });
    return wins;
}
function getNumLosses(e){
    var losses;
    e.on('value',function(snap){
        snap.forEach(function(childNodes){
            if(childNodes.key == "numLosses"){
                losses = childNodes.val();
            }
        });
    });
    return losses;
}
function getLevel(e){
    var level;
    e.on('value',function(snap){
        snap.forEach(function(childNodes){
            if(childNodes.key == "level"){
                level = childNodes.val();
            }
        });
    });
    return level;
}
function getHitDamage(avgDmg, crit){
    // define balancing stats
    var r = Math.random();      // set r value for damage equation
    var k = 3;                  // set crit damage to 3x normal damage
    var p = 0.20;               // set variance to 20%
    // calculate damage for next hit
    var damage = avgDmg + ((2*p)/100)*(r - 0.5)*avgDmg;     // acceptable formula for balanced combat system

    var chance = getRandomInt(100); // add crit chance
    if(chance < crit){
        damage = damage*k;
    }
    return damage;
}


// SETTERS //////////////////////////////////////////////////////////////////////
function setFighterStats(e, exp, hp, crit, avgDmg, numWins, numLosses, level){
    e.set({
        exp: exp,
        health: hp,
        critical: crit,
        avgDmg: avgDmg,
        numWins: numWins,
        numLosses: numLosses,
        level: level
    });
}

function setFighterExp(e, exp){
    setFighterStats(e, exp, getFighterHealth(e), getFighterCrit(e), getFighterAvgDmg(e), getNumWins(e), getNumLosses(e), getLevel(e));
}
function setFighterHealth(e, hp){
    setFighterStats(e, getFighterExp(e), hp, getFighterCrit(e), getFighterAvgDmg(e), getNumWins(e), getNumLosses(e), getLevel(e));
}
function setFighterCrit(e, crit){
    setFighterStats(e, getFighterExp(e), getFighterHealth(e), crit, getFighterAvgDmg(e), getNumWins(e), getNumLosses(e), getLevel(e));
}
function setFighterAvgDmg(e, avgDmg){
    setFighterStats(e, getFighterExp(e), getFighterHealth(e), getFighterCrit(e), avgDmg, getNumWins(e), getNumLosses(e), getLevel(e));
}
function setNumWins(e, wins){
    setFighterStats(e, getFighterExp(e), getFighterHealth(e), getFighterCrit(e), getFighterAvgDmg(e), wins, getNumLosses(e), getLevel(e));
}
function setNumLosses(e, losses){
    setFighterStats(e, getFighterExp(e), getFighterHealth(e), getFighterCrit(e), getFighterAvgDmg(e), getNumWins(e), losses, getLevel(e));
}
function setLevel(e, level){
    setFighterStats(e, getFighterExp(e), getFighterHealth(e), getFighterCrit(e), getFighterAvgDmg(e), getNumWins(e), getNumLosses(e), level);
}

function updateStats(e){
    //console.log(e);
    document.getElementById("stats_kills").innerHTML = getNumWins(e);
    document.getElementById("stats_deaths").innerHTML = getNumLosses(e);
    document.getElementById("stats_ratio").innerHTML = Math.round(((getNumWins(e) / getNumLosses(e)) + Number.EPSILON) * 100) / 100;
    document.getElementById("stats_level").innerHTML = getLevel(e);
    document.getElementById("stats_experience").innerHTML = getFighterExp(e);
    document.getElementById("stats_nextLevel").innerHTML = getNumWins(e);
}

function addExperience(e, win){
    if(win){
        setNumWins(e, getNumWins(e)+1);
    }
    else{
        setNumLosses(e, getNumLosses(e)+1);
    }
    var experience = getNumWins(e)*25 + getNumLosses(e)*15;
    setFighterExp(e, experience);
    update(e);
}

function calcLevel(e){
    var exp = getFighterExp(e);
    var level = 1;
    var count = 50;
    while(count <= exp){
        count = count * 2;
        level++;
    }
    setLevel(e, level);
}

function calcHealth(e){
    var exp = getFighterExp(e);
    var nextLevelHealth = Math.pow(250.0, 1+(exp*0.000001));
    setFighterHealth(e, nextLevelHealth);
}
function calcAvgDmg(e){
    var exp = getFighterExp(e);
    var nextLevelAvgDmg = Math.pow(10.0, 1+(exp*0.00001));
    setFighterAvgDmg(e, nextLevelAvgDmg);
}
function calcCritical(e){
    var exp = getFighterExp(e);
    var nextLevelCrit = Math.pow(5.0, 1+(exp*0.00001));
    setFighterCrit(e, nextLevelCrit);
}

function update(e){
    calcLevel(e);
    calcHealth(e);
    //calcAvgDmg(e);
    //calcCritical(e);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function sleep(millisecondsToWait){
    var now = new Date().getTime();
    while(new Date().getTime() < now + millisecondsToWait){}
}

