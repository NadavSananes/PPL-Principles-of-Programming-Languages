import * as R from "ramda";

const stringToArray = R.split("");
/**
 * @param x 
 * @returns x in lower case.
 */
const f = (x: string): string => R.toLower(x);
/**
 * @param x 
 * @returns true iff x is a letter.
 */
const isALetter = (x: string) : boolean => (x >= "A" && x <= "Z") || (x >= "a" && x <= "z"); 

/* Question 1 */
export const countLetters: (x : string) => {[index: string]: number} = (x : string) => R.countBy(f)(stringToArray(x).filter(isALetter));


/* Question 2 */
/**
 * @param x 
 * @returns true iff x is a bracket.
 */
const isABracket: (x: string) => boolean = (x:string) => (x == "[") || (x == "{") || (x == "(") || (x == ")") || (x == "}") || (x == "]");
/**
 * @param x 
 * @returns return true iff x is a open bracket.
 */
const isAOpenBracket: (x: string) => boolean = (x:string) => (x == "[") || (x == "{") || (x == "(");

/**
 * This function treats the acc like a stack to solve this problem. if we get open bracket, we append it to the acc.
 * if we get close bracket, we remove to last bracket from the curr or append -1, which meant to mark that parentheses is not paried.
 * @param acc = array of bracket.
 * @param curr = bracket.
 * @returns = string array with brackets or/and -1.
 */
const func: (acc: string[], curr: string) => string[] = (acc: string[], curr: string) =>
    isAOpenBracket(curr) ? R.append(curr, acc) :
                (curr == "]" && R.length(acc) != 0 && acc[R.length(acc) - 1] == "[") ? R.dropLast(1, acc) :
                (curr == "}" && R.length(acc) != 0 && acc[R.length(acc) - 1] == "{") ? R.dropLast(1, acc) :
                (curr == ")" && R.length(acc) != 0 && acc[R.length(acc) - 1] == "(") ? R.dropLast(1, acc) :
                R.append("-1", acc);
                
export const isPaired: (x:string) => boolean = (x:string) => R.isEmpty(stringToArray(x).filter(isABracket).reduce(func, []));


/* Question 3 */
export type WordTree = {
    root: string;
    children: WordTree[];
}

export const treeToSentence : (t1 : WordTree) => string = (t1 : WordTree) => R.join(' ', (recursiveTreeToSentence(t1)));

/**
 * This function build recursivly the string from t1.
 * @param t1 WordTree.
 * @returns 
 */
const recursiveTreeToSentence : (t1 : WordTree) => string[] = (t1 : WordTree) => 
    (t1.children == null || t1.children.length == 0)? R.append(t1.root, []) : R.concat(R.append(t1.root, []), R.flatten(t1.children.map((x: WordTree) => recursiveTreeToSentence(x))));

const t1: WordTree = {
    root: "Hello",
    children: [
        {
        root: "students",
        children: [
            {
            root: "how",
            children: []
            }
        ]
        },
        {
        root: "are",
        children: []
        },
        {
        root: "you?",
        children: []
        },
        ]
    }