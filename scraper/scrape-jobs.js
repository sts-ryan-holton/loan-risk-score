const puppeteer = require('puppeteer');
const cheerio = require('cheerio')
const fs = require('fs')
const si = require('systeminformation');
const args = require('minimist')(process.argv.slice(2))
const writeStream = fs.createWriteStream('./scraper/data/salary.json')


// define global vars
var searchRadius   = (args['searchRadius'] && args['searchRadius'] != '') ? parseInt(args['searchRadius']) : 300,
    pageNumber     = 00,
    scrapedJobs    = 0,
    unableToScrape = 0,
    cpuTemp        = 0,
    memThreshold   = (args['memThreshold'] && args['memThreshold'] != '') ? parseInt(args['memThreshold']) : 60,
    tempThreshold  = (args['tempThreshold'] && args['tempThreshold'] != '') ? parseInt(args['tempThreshold']) : 93,
    scrapeInterval = (args['scrapeInterval'] && args['scrapeInterval'] != '') ? parseInt(args['scrapeInterval']) : 1000,
    pauseDelay     = (args['thresholdDelay'] && args['thresholdDelay'] != '') ? parseInt(args['thresholdDelay']) : 7500,
    pauseScraping  = false,
    scrapeOnRun    = false,
    urlToScrape    = '', // example: https://www.indeed.co.uk/jobs?l=London
    jobCard        = '.jobsearch-SerpJobCard',
    jobCardSalary  = '.salarySnippet .salaryText'


// scrape the website
async function scrapeWebsite(radius, pageNo) {

  // calculate CPU temperature
  si.cpuTemperature()
    .then(data => cpuTemp = data.main)
    .catch(error => console.error(error));

  // get memory usage of scraper
  const used = process.memoryUsage().heapUsed / (1024 * 1024);

  // pause scraper if Memory or Temp exceeds defined values
  if (used > memThreshold || cpuTemp > tempThreshold) {
    console.log('== SCRAPING PAUSED ===')
    pauseScraping = true
    setTimeout(function(){
      console.log('== SCRAPING RESUMED ===')
      pauseScraping = false
    }, pauseDelay);
  }

  // output stats to terminal
  console.log(`=== SCRAPING: PAGE: ${pageNumber}, JOBS: ${scrapedJobs}, ERRORED: ${unableToScrape}, MEM: ${used}, TEMP: ${cpuTemp} ===`)

  // init Puppeteer
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 926 });
  await page.goto(`${urlToScrape}&radius=${radius}&start=${pageNo}`);

  // get all HTML content from fetched URL
  let pageData = await page.evaluate(() => document.body.innerHTML);

  // define Cheerio to use jQuery like syntax
  const $ = await cheerio.load(pageData)

  // get job cards
  $(jobCard).each((index, job) => {
    if ($(job).find(jobCardSalary).length) {
      const salaryText = $(job).find(jobCardSalary).text()

      // calculate percentages
      function percentage(percent, percentageFrom) {
         return (percent / 100) * parseInt(percentageFrom);
      }

      // salary to add
      let salary = 0

      if (salaryText.includes('year') || salaryText.includes('annum')) {
        if (salaryText.includes('-')) {
          const doubleSalary = salaryText.split('-')
          var minSalary = doubleSalary[0].replace(/\s/g,'').replace(/,/g, '') // remove whitespace, replace commas
          var maxSalary = doubleSalary[1].replace(/\s/g,'').replace(/,/g, '') // remove whitespace, replace commas
          minSalary = minSalary.replace(/\D/g,'') // extract numbers
          maxSalary = maxSalary.replace(/\D/g,'') // extract numbers

          var aveSalary = (parseInt(minSalary) + parseInt(maxSalary)) / 2 // combine min & max salary, and get an average

          // deduct 17% for tax / NI margin for year
          aveSalary = parseInt(aveSalary) - percentage(17, parseInt(aveSalary))

          // salary output: average doubled salary, monthly
          salary = parseInt(aveSalary) / 12

        } else {
          const singleSalary = salaryText.replace(/\s/g,'').replace(/,/g, '') // remove whitespace, replace commas
          var singleSalaryRaw = singleSalary.replace(/\D/g,'') // extract numbers

          // deduct 17% for tax / NI margin for year
          var singleSalaryOutput = parseInt(singleSalary) - percentage(17, parseInt(singleSalaryRaw))

          // salary output: single salary, monthly
          salary = parseInt(singleSalaryOutput) / 12

        }
      } else if (salaryText.includes('hour')) {
        const hourlySalary = salaryText
            .replace(/[^0-9.-]/g, '') // remove chars except number, hyphen, point.
            .replace(/(\..*)\./g, '$1')  // remove multiple points.
            .replace(/(?!^)-/g, '') // remove middle hyphen.
            .replace(/^0+(\d)/gm, '$1') // remove multiple leading zeros.

        var randomNumber = Math.floor(Math.random() * 10),
            salaryHours = (randomNumber < 5) ? 37 : 25,
            salaryWeeks = 4.3,
            salaryMonths = 12

        if (hourlySalary.length < 6) {
          var aveYearFromHour = Math.round(parseInt(hourlySalary) * salaryHours * salaryWeeks * salaryMonths) // weekly hours X weeks in month X months in year

          // deduct 17% for tax / NI margin for year
          aveYearFromHour = aveYearFromHour - percentage(17, parseInt(aveYearFromHour))

          // salary output: single salary, monthly
          salary = parseInt(aveYearFromHour) / 12
        }

      }

      // determine affordability
      var machineLearningOutput = (parseInt(salary) < 1500) ? 0 : 1

      // add starting zeros
      function leftFillNum(num, targetLength) {
        return num.toString().padStart(targetLength, 0);
      }

      // check if salary is a 3 digit number and add starting zero to make 4 digits
      if (salary > 0 && salary < 1000) {
        salary = leftFillNum(Math.trunc(salary), 4)
      } else {
        salary = Math.trunc(salary)
      }

      // create compatible format for machine learning
      salary = salary.toString().split('').join(',')

      // build JSON file for data consumption
      if (!isNaN(parseInt(salary)) && salary.length > 2 && salary.length < 8) {
        writeStream.write(`{input:[${salary}],output:[${machineLearningOutput}]},`)
        scrapedJobs++
      } else {
        unableToScrape++
      }

      // close browser after completion to prevent memory overloading
      browser.close();

    }
  });

  // increment page number to pick new page
  if (pageNumber < 50000) {
    pageNumber+=10
  } else {
    pageNumber = 0
  }
}


// run the scraper on loop and increment details
if (scrapeOnRun && urlToScrape != '') {
  setInterval(() => {
    if (!pauseScraping) {
      scrapeWebsite(searchRadius, pageNumber)
    }
  }, scrapeInterval);
}


// run the scraper on start
if (scrapeOnRun && urlToScrape != '') {
  scrapeWebsite(searchRadius, pageNumber)
}

if (urlToScrape == '') console.log('=== ERROR: You\'ll need to add a URL in: "scraper/scrape-jobs.js, line: 21" to scrape. ===')
if (!scrapeOnRun) console.log('=== ERROR: You\'ll need to enable the scraper in: "scraper/scrape-jobs.js, line: 20". ===')
