const axios = require('axios');
const {Suggestions} = require('actions-on-google');
const {Suggestion} = require("dialogflow-fulfillment");
const {WebhookClient,Image}=require("dialogflow-fulfillment");
const { request, response } = require("express");
const express=require("express");
const app=express();


async function makeRequest(WorkPhone,LastDigits) {
    const config = {
        method: 'get',
        url: `https://track-my-repair.triarom.co.uk/api/v1/work_order/${WorkPhone}?phone=${LastDigits}`,
        headers: { 'text': 'application/json' }
    }

    let res = await axios(config)
    let message = `Status= ${res.data.status} , Message = ${res.data.job_notes[0].text}`
    return message
}

async function makeRequestPostCode(postCode) {
    const config = {
        method: 'get',
        url: `https://check-availability.broadband.triarom.co.uk/api/v1/addresses/${postCode}`,
        headers: { 'text': 'application/json' }
    }
    let res = await axios(config)
    return res.data
}


async function makeRequestPostCodeId(id) {
    const config = {
        method: 'get',
        url: `https://check-availability.broadband.triarom.co.uk/api/v1/address/${id}/products`,
        headers: { 'text': 'application/json' }
    }
    let res = await axios(config)
    console.log(res.data)
    productsData.push(res.data)
    console.log("done")
    return res.data
}

var WrokPhonedata = [];
var Apidata=[];
var productsData=[];


app.post("/webhook",express.json(),(request,response)=>{          //fulfillment mai bhi url mai /webhook lagana huga 
    const agent=new WebhookClient({request:request,response:response});
        
    function work_phone_number(agent){
        WrokPhonedata.pop()
        WrokPhonedata.push(agent.parameters.number)
        agent.add("can you please tell last 4 digits of your phone number")
    }

    async function work_phone_number_follow(agent){
        let work_number = agent.parameters["number"]
        let message = await makeRequest(WrokPhonedata.pop(),work_number[0])
        agent.add(message)
    }

    function welcome(agent){
        agent.add("Welcome To Triarom Computers How Can I Help?")
        agent.add(new Suggestion("Track my repair"))
        agent.add(new Suggestion("Broadband Availability"))
        agent.add(new Suggestion("Submit a Ticket"))
        agent.add(new Suggestion("What Are The Opening Hours ?"))
        agent.add(new Suggestion("Faqs"))
    }

    function faq(agent){
        agent.add("Hi ! how can i help you sir ?")
        agent.add(new Suggestion("my computer doesnt have internet what shall i do"))
        agent.add(new Suggestion("my computer wont turn on what can i do"))
    }

    async function postcode(agent){
        Apidata.pop()

        let postCode = agent.parameters["zip-code"]
        let res = await makeRequestPostCode(postCode)
        Apidata.push(res)

        res.forEach(element => {
           agent.add(new Suggestion(`${element.address}`))
        });
        agent.add("please choose Address")
    }

    async function postcodeFollow(agent){
        productsData.pop()
        let postcodeAddres = agent.parameters.address
        console.log(postcodeAddres)
        let lastApiResult= Apidata.pop()
        let id = ""
        lastApiResult.forEach((element) => {
            if (element.address==postcodeAddres){
                id = element.id
            }
         });
        makeRequestPostCodeId(id)
        let delayres = await delay(3500);
        agent.add("thanks")    
        agent.add(new Suggestion("View products"))  
    }

    async function postcodeApiFollow(agent){
        console.log("started")
        let delayres = await delay(3200);
        let data = productsData.pop()
        console.log(data)
        data.products.forEach((element) => {
            agent.add(`Technology : ${element.technology}, limited_capacity: ${element.limited_capacity}, est-up-speed: ${element.est_up_speed}, est-down-speed: ${element.est_down_speed}`)
         });
    }
    const delay = (delayInms) => {
        return new Promise(resolve => setTimeout(resolve, delayInms));
    }


    let intentMap= new Map();
    intentMap.set("Default Welcome Intent",welcome)
    intentMap.set("work-phone number",work_phone_number);
    intentMap.set("work-phone number - custom",work_phone_number_follow);
    intentMap.set("postcode",postcode);
    intentMap.set("postcodeAddres",postcodeFollow);
    intentMap.set("apiresults",postcodeApiFollow);
    intentMap.set("Faq",faq);
    agent.handleRequest(intentMap)
})

const port = process.env.PORT || 4000;

app.listen(port,()=>{
    console.log("server is up on 4000");
})

