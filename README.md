# :moneybag: Loan Affordability (Risk Score)

This project uses machine learning [neural networks](https://en.wikipedia.org/wiki/Artificial_neural_network) using [Brain JS](https://github.com/BrainJS/brain.js#brainjs) to calculate an applicant's likelihood of being able to repay a loan. A **Risk Score** is provided to the applicant ranging from `0` to `500`, the higher the number, the better (more chance of affording the loan)


## :star2: Demo

**[See it in action](https://sts-ryan-holton.github.io/loan-risk-score/)**

#### :wrench: Param options

- `?enable_seed_data=true` - pass this to generate random data to test the system.
- `?enable_logs=true` - pass this to get real-time console updates as Brain JS learns your data.
- `?enable_risk_factor_logging=true` - pass this to see your individual risk factors, logged to the console.


## :bulb: How it works

**We use [Brain JS](https://github.com/BrainJS/brain.js#brainjs)**

The core concept of this system is to provide a **score** to the user on their likelihood of being able to repay a loan using machine learning. This works by feeding the machine learning system a set of "training data" in a JSON format, providing an input, and an output as to whether the input is good or bad, the system can then figure out a probability between 0-100 _(100 being very likely to be able to afford a loan)_


## :books: Training Data

Training data collected from hundreds of jobs via Node JS scraping using Cheerio and Puppeteer _(development use only)_

Using the below assumptions, if a take-home pay is provided lower than **£1,500** a month, and doesn't look accurate, a lower probability will occur.

#### Salary

1. If min & max salary provided, they're added together and divided to get a yearly average.
2. If single salary provided, no extra assumptions made.
3. If hourly salary provided, we randomly pick either 37 or 25 hrs a week, and 4.3 weeks a month, calculated over a year.
4. All salaries are then divided by 12 to get a monthly salary.
5. All salaries have approx 17% deducted as a buffer for tax and NI.

#### Expenses

1. £190/month, **Utility Bills (Gas, Electric, Water, Phone, TV, Broadband)**, [source](https://www.moneyadviceservice.org.uk/blog/what-is-the-average-cost-of-utility-bills-per-month)
2. £600/month, **Rent/Mortgage (1 bedroom)**, [source](https://www.bbc.co.uk/news/business-46072509)
3. £260/month, **Food shopping (small family)**, [source](https://www.moneyadviceservice.org.uk/blog/how-does-your-household-food-spend-compare)

#### Loan

1. A loan average of £500 taken based on approx 6,000 applicants.


## :mag: Scraper

Install the scraper, you need **Node JS 10 or greater**

``` bash
# clone project
$ git clone git@github.com:sts-ryan-holton/loan-risk-score.git

# install dependencies.
$ npm install
```

### :wrench: Starting

``` bash
# start scraping
$ node scraper/scrape-jobs.js
```

### :wrench: Starting - With options

``` bash
# start scraping with options (you can pass all, or some of the following with number format)
$ node scraper/scrape-jobs.js --searchRadius=300 --memThreshold=50 --tempThreshold=93 --scrapeInterval=1000 --thresholdDelay=7500
```
