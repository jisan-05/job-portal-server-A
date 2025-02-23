const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pmlso.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );

        // Jobs Related Apis
        const JobsCollection = client.db("jobPortalA").collection("Jobs");
        const jobApplicationCollection = client.db("jobPortalA").collection("job_application")

        app.get("/jobs", async (req, res) => {
            const email = req.query.email;
            let query = {};
            if(email){
                query = { hr_email: email }
            }

            const cursor = JobsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });
        app.get("/jobs/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await JobsCollection.findOne(query);
            res.send(result);
        });

        app.post('/jobs',async(req,res)=> {
            const newJob = req.body;
            const result = await JobsCollection.insertOne(newJob)
            res.send(result)
        })

        // job application apis
        // get all data , get one data , get some data [0,1,many]
        app.get('/job-application', async(req,res)=>{
            const email = req.query.email;
            const query = {applicant_email: email}
            const result = await jobApplicationCollection.find(query).toArray();

            // fokira way to aggregate data 
            for (const application of result){
                console.log(application.job_id)
                const query1 = {_id: new ObjectId(application.job_id)}
                const job = await JobsCollection.findOne(query1);
                if(job){
                    application.title = job.title;
                    application.company = job.company;
                    application.company_logo = job.company_logo;
                    application.location = job.location;
                }
            }

            res.send(result)
        })
        // app.get('/job-applications/:id') ===> get a specific job application by id
        app.get('/job-applications/jobs/:job_id', async(req,res) => {
            const jobId = req.params.job_id;
            const query = {job_id: jobId}
            const result = await jobApplicationCollection.find(query).toArray();
            res.send(result)
        })

        
        app.post('/job-applications', async(req,res)=> {
            const application = req.body;
            const result = await jobApplicationCollection.insertOne(application)

            // Not the Best Way (User aggregate)
            // skip --> it
            const id = application.job_id;
            const query = {_id : new ObjectId(id)}
            const job = await JobsCollection.findOne(query);
            let newCount = 0;
            if(job.applicationCount){
                newCount = job.application + 1;
            }
            else{
                newCount = 1;
            }

            // now update the job info
            const filter = {_id: new ObjectId(id)}
            const updateDoc = {
                $set:{
                    applicationCount: newCount
                }
            }

            const updateResult = await JobsCollection.updateOne(filter,updateDoc);

            res.send(result);
        })
 
        app.patch('/job-applications/:id', async(req,res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = {_id: new ObjectId(id)};
            const updatedDoc = {
                $set:{
                    status: data.status
                }
            }
            const result = await jobApplicationCollection.updateOne(filter,updatedDoc)
            res.send(result)
        })


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Job is falling from the sky");
});
app.listen(port, () => {
    console.log("Server is running on port: ", port);
});
