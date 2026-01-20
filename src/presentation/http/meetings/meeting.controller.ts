import { Request, Response } from 'express';
import { MeetingRepository } from '../../../modules/meetings/meeting.repository';

export class MeetingController {
  private meetingRepo = new MeetingRepository();

  list = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const meetings = await this.meetingRepo.findByUserId(userId);
      res.json(meetings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const meeting = await this.meetingRepo.updateStatus(id, status);
      res.json(meeting);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.meetingRepo.delete(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
