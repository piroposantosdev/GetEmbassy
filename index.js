const puppeteer = require('puppeteer');
const fs = require('fs-extra');
var os = require("os");
const { Console } = require('console');

(async () => {
    var ii = 0;    
    const browser = await puppeteer.launch({headless: true, args: ['--lang=en']});    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768});
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if(req.resourceType() === 'image'){
            req.abort();
        }
        else {
            req.continue();                
        }
    });
    await page.goto('https://www.embassy-worldwide.com/');

    //hide cookie alert
    setInterval(async function(){
        const [button] = await page.$x("//button[contains(., 'Agree and proceed')]");
        if (button) {
            await button.click();            
        }
    }, 500);
    
    const hrefs1 = await page.evaluate(
        () => Array.from(
          document.querySelectorAll('a[href]'),
          a => a.getAttribute('href')
        )
    );
    
    //Get a list of embassies available and push to array
    var pages = [];
    for(ii = 0; ii < hrefs1.length; ii++){
        if(hrefs1[ii].indexOf('https://www.embassy-worldwide.com/country/') > -1){
            pages.push(hrefs1[ii]);
        }
    }

    //Clear output folder to prevent erros
    var output = "./output";
    fs.emptyDirSync(output);
    
    console.log('Cleaning folder...');  
    console.log('Processing...');  

    //if embassies array is not empty get data
    if(pages.length > 0){
        for(let i = 0; i < pages.length -1; i++){
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 720});
            await page.setRequestInterception(true);
            await page.setDefaultNavigationTimeout(0);            

            page.on('request', (req) => {
                if(req.resourceType() === 'image'){
                    req.abort();
                }
                else {
                    req.continue();                
                }
            });
            await page.goto(pages[i]);                                   
            
            //hide cookie alert
            setTimeout(async function(){
                const [button] = await page.$x("//button[contains(., 'Agree and proceed')]");
                if (button) {
                    await button.click();                    
                }
            },5000);                     

            setTimeout(async function(){                                
                const [button2] = await page.$x("//li[contains(., 'Embassies')]");
                if (button2) {                    
                    await button2.click();

                    setTimeout(async function(){ 
                        const data = await page.evaluate(() => document.querySelector('.posts-container').innerText);
                        var filename = data.split('\n')[0].split(" (")[0].replace("Foreign representations in ", "") + "-out";                                           
                        var folder = output + "/" + data.split('\n')[0].split(" (")[0].replace("Foreign representations in ", "");
                        fs.mkdirSync(folder);                        
                        
                        fs.writeFileSync('./'+ folder + '/' + filename + '.txt', '');
                        for(iii = 1; iii < data.split('\n').length; iii++){
                            fs.appendFile('./'+ folder + '/' + filename + '.txt', data.split('\n')[iii] + os.EOL, function (err) {
                                if (err) throw err;
                                console.log('Saved '+ filename +'!');
                            });
                        }   
                        
                        const data2 = await page.evaluate(() => document.querySelector('.col-md-6').innerText);
                        var filename = data2.split('\n')[0].split(" (")[0].replace(" representations abroad", "") + "-in";
                        fs.writeFileSync('./'+ folder + '/' + filename + '.txt', '');
                        for(iii = 1; iii < data2.split('\n').length; iii++){
                            fs.appendFile('./'+ folder + '/' + filename + '.txt', data2.split('\n')[iii] + os.EOL, function (err) {
                                if (err) throw err;
                                console.log('Saved '+ filename +'!');
                            });                                                        
                        } 
                        
                        await page.close();                                                                                                   
                         
                        //When finish, it closes browser
                        if(i == (pages.length - 2)){
                            console.log("All embassies downloaded and saved to file, total of " + i + ' countries');
                            let pages = await browser.pages();

                            pages.forEach(async (page) => await page.close());                             
                            await browser.close();
                            process.exit();                                               
                        }
                    }, 5000);                    
                }                                                                         
            }, 10000); 
            
            //Close all pages that not correspond to embassy page
            let pagesArr = await browser.pages();
            pagesArr.forEach(async (page) => {
                if(page.url().indexOf("embassy") == -1 && page.url().indexOf("about") == -1)
                {
                    await page.close();                    
                }                
            });                                       
        }                 
    }    
})();