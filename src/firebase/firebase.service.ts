import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ObjectId } from 'mongoose';

@Injectable()
export class FirebaseService {
  async sendNotification(deviceToken: string, title: string, body: string) {
    const message: admin.messaging.Message = {
      notification: {
        title: title,
        body: body,
      },
      token: deviceToken,
    };

    try {
      await admin.messaging().send(message);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Function to subscribe a user to an event topic
  async subscribeUserToTopic(userID: ObjectId, topic: string) {
    try {
      const userIDString = userID.toString();
      await admin.messaging().subscribeToTopic([userIDString], topic);
      console.log('User subscribed to topic:', userIDString, topic);
    } catch (error) {
      console.error('Error subscribing user to topic:', error);
    }
  }

  // Function to unsubscribe a user from an event topic
  async unsubscribeUserFromTopic(userID: ObjectId, topic: string) {
    try {
      const userIDString = userID.toString();

      await admin.messaging().unsubscribeFromTopic([userIDString], topic);
      console.log('User unsubscribed from topic:', userIDString, topic);
    } catch (error) {
      console.error('Error unsubscribing user from topic:', error);
    }
  }

  async sendNotificationToTopic(topic: string, title: string, body: string) {
    const message: admin.messaging.Message = {
      notification: {
        title: title,
        body: body,
      },
      topic: topic,
    };

    try {
      await admin.messaging().send(message);
      console.log('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}
