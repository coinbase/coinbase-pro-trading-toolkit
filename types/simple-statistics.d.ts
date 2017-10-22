/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2017 Coinbase, Inc.                                                                                      *
 *                                                                                                                    *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance     *
 * with the License. You may obtain a copy of the License at                                                          *
 *                                                                                                                    *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                         *
 *                                                                                                                    *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on*
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                 *
 * License for the specific language governing permissions and limitations under the License.                         *
 **********************************************************************************************************************/

/** Declaration file generated by dts-gen */

declare module 'simple-statistics' {
    export class BayesianClassifier {
        constructor();

        score(item: any): any;

        train(item: any, category: any): void;

    }

    export class PerceptronModel {
        constructor();

        predict(features: any): any;

        train(features: any, label: any): any;

    }

    export class bayesian {
        constructor();

        score(item: any): any;

        train(item: any, category: any): void;

    }

    export class perceptron {
        constructor();

        predict(features: any): any;

        train(features: any, label: any): any;

    }

    export const epsilon: number;

    export const standardNormalTable: number[];

    export function addToMean(mean: any, n: any, newValue: any): any;

    export function average(x: any): any;

    export function bernoulliDistribution(p: any): any;

    export function binomialDistribution(trials: any, probability: any): any;

    export function bisect(func: any, start: any, end: any, maxIterations: any, errorTolerance: any): any;

    export function chiSquaredGoodnessOfFit(data: any, distributionType: any, significance: any): any;

    export function chunk(x: any, chunkSize: any): any;

    export function ckmeans(x: any, nClusters: any): any;

    export function combinations(x: any, k: any): any;

    export function combinationsReplacement(x: any, k: any): any;

    export function combineMeans(mean1: any, n1: any, mean2: any, n2: any): any;

    export function combineVariances(variance1: any, mean1: any, n1: any, variance2: any, mean2: any, n2: any): any;

    export function cumulativeStdNormalProbability(z: any): any;

    export function equalIntervalBreaks(x: any, nClasses: any): any;

    export function erf(x: any): any;

    export function errorFunction(x: any): any;

    export function factorial(n: any): any;

    export function geometricMean(x: any): any;

    export function harmonicMean(x: any): any;

    export function interquartileRange(x: any): any;

    export function inverseErrorFunction(x: any): any;

    export function iqr(x: any): any;

    export function kernelDensityEstimation(X: any, kernel: any, bandwidthMethod: any): any;

    export function linearRegression(data: any): any;

    export function linearRegressionLine(mb: any): any;

    export function mad(x: any): any;

    export function max(x: any): any;

    export function maxSorted(x: any): any;

    export function mean(x: any): any;

    export function median(x: number[]): number;

    export function medianAbsoluteDeviation(x: any): any;

    export function medianSorted(sorted: number[]): number;

    export function min(x: any): any;

    export function minSorted(x: any): any;

    export function mode(x: any): any;

    export function modeFast(x: any): any;

    export function modeSorted(sorted: any): any;

    export function numericSort(x: any): any;

    export function permutationsHeap(elements: any): any;

    export function poissonDistribution(lambda: any): any;

    export function probit(p: any): any;

    export function product(x: any): any;

    export function quantile(x: any, p: any): any;

    export function quantileSorted(x: any, p: any): any;

    export function quickselect(arr: any, k: any, left: any, right: any): void;

    export function rSquared(x: any, func: any): any;

    export function rms(x: any): any;

    export function rootMeanSquare(x: any): any;

    export function sample(x: any, n: any, randomSource: any): any;

    export function sampleCorrelation(x: any, y: any): any;

    export function sampleCovariance(x: any, y: any): any;

    export function sampleKurtosis(x: any): any;

    export function sampleSkewness(x: any): any;

    export function sampleStandardDeviation(x: any): any;

    export function sampleVariance(x: any): any;

    export function sampleWithReplacement(x: any, n: any, randomSource: any): any;

    export function shuffle(x: any, randomSource: any): any;

    export function shuffleInPlace(x: any, randomSource: any): any;

    export function sign(x: any): any;

    export function standardDeviation(x: any): any;

    export function subtractFromMean(mean: any, n: any, value: any): any;

    export function sum(x: any): any;

    export function sumNthPowerDeviations(x: any, n: any): any;

    export function sumSimple(x: any): any;

    export function tTest(x: any, expectedValue: any): any;

    export function tTestTwoSample(sampleX: any, sampleY: any, difference: any): any;

    export function uniqueCountSorted(x: any): any;

    export function variance(x: any): any;

    export function zScore(x: any, mean: any, standardDeviation: any): any;
}
