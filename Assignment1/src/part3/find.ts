import { Result, makeFailure, makeOk, bind, either } from "../lib/result";
import * as R from "ramda";

/* Library code */
const findOrThrow = <T>(pred: (x: T) => boolean, a: T[]): T => {
    for (let i = 0; i < a.length; i++) {
        if (pred(a[i])) return a[i];
    }
    throw "No element found.";
}

export const findResult : <T>(f: (x: T) => boolean, TArray: T[]) => Result<T> = 
    <T>(f: (x: T) => boolean, TArray: T[]) => {
        const TArrayLeft = TArray.filter(f);
        return R.isEmpty(TArrayLeft)? makeFailure("No such element") : makeOk(TArrayLeft[0]);
    }

/* Client code */
const returnSquaredIfFoundEven_v1 = (a: number[]): number => {
    try {
        const x = findOrThrow(x => x % 2 === 0, a);
        return x * x;
    } catch (e) {
        return -1;
    }
}

export const returnSquaredIfFoundEven_v2: (nArray : number[]) => Result<number> = (nArray : number[]) => bind(findResult((x: number): boolean => x % 2 == 0, nArray), (x: number): Result<number> => makeOk(x * x));

export const returnSquaredIfFoundEven_v3 : (nArray : number[]) => number = (nArray : number[]) => either(findResult((x:number): boolean => x %2 == 0, nArray), (x: number): number => x*x, (x: string): number => -1);