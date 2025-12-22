import 'dotenv/config';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
    res.send("השרת של הבוט באוויר!");
});

app.post("/webhook", (req: Request, res: Response) => {
    console.log("התקבלה הודעה חדשה:", req.body);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});