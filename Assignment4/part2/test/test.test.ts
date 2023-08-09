import { describe, expect, test } from '@jest/globals'
import {
    delayedSum, Post, postsUrl, postUrl, invalidUrl, fetchData, fetchMultipleUrls, correctResponse, correctResultToFetchMulti, apiArray
} from '../src/part2';

describe('Assignment 4 Part 2', () => {
    describe('Q2.1 delayedSum (6 points)', () => {
        test('delayedSum returns the sum', () => {
            const a = 5;
            const b = 10;
            const delay = 1000;
            delayedSum(a, b, delay).then((sum) => {
                expect(sum).toEqual(a+b);
            });
        })
        test('delayedSum waits at least the specified delay', () => {
            const a = 5;
            const b = 10;
            const delay = 1000;
            const startTime = Date.now();
            const myPromise = delayedSum(a, b, delay);
            myPromise.finally(()=> {
                myPromise.then((sum) => {
                    expect(Date.now() - startTime >= delay).toEqual(true);
                })
            })
        })
    })

    describe('Q2.2 fetchData (12 points)', () => {
        test('successful call to fetchData with array result', async () => {
            const myData =  await fetchData(postsUrl);
            expect(myData).toEqual(correctResponse);
        })

        test('successful call to fetchData with Post result', async () => {
            const num = "8";
            const myData = await fetchData(postUrl + num);
            expect(myData).toEqual(correctResponse[7]);
        })

        test('failed call to fechData', async () => {
            const myData = await fetchData(invalidUrl);
            expect(myData).toEqual({});
        })

        test('failed call to fetchData that return an Error', async () => {
            const myData = await fetchData("hhhhh" + invalidUrl);
            expect(myData).toEqual("TypeError: fetch failed")
        })

    })

    describe('Q2.3 fetchMultipleUrls (12 points)', () => {
        test('successful call to fetchMultipleUrls', async () => {
            const twoAPI = [postUrl + "60", postUrl + "3"];
            const myData = await fetchMultipleUrls(twoAPI);
            expect(myData).toEqual([correctResponse[59], correctResponse[2]]);
        })

        test('successful call to fetchMultipleUrls: verify results are in the expected order ', async () => {
            const myData = await fetchMultipleUrls(apiArray);
            expect(myData[19]).toEqual(correctResponse[0]);
        })

        test('failed call to fetchMultipleUrls', async () => {
            const twoAPI = [postUrl + "1", invalidUrl];
            const myData = await fetchMultipleUrls(twoAPI);
            expect(myData[1]).toEqual({});
        })

        test('failed call to fetchMultipleUrls that return an Error', async () => {
            const fiveAPI = [postUrl + "1", postUrl + "8", postUrl + "6", "hhhhh" + invalidUrl, postUrl + "3"];
            const myData = await fetchMultipleUrls(fiveAPI);
            expect(myData).toEqual("TypeError: fetch failed")
        })

    })
});

