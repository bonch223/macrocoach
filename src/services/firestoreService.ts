import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { Client, Food, Log, WeeklyReport } from '../types';

export class FirestoreService {
  // Client Management
  static async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...clientData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Failed to create client: ${error}`);
    }
  }

  static async getClient(clientId: string): Promise<Client | null> {
    try {
      const docRef = doc(db, 'clients', clientId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Client;
    } catch (error) {
      throw new Error(`Failed to get client: ${error}`);
    }
  }

  static async getClientsByCoach(coachId: string): Promise<Client[]> {
    try {
      // Temporarily remove orderBy to avoid index requirement
      const q = query(
        collection(db, 'clients'),
        where('linkedCoachId', '==', coachId)
      );
      const querySnapshot = await getDocs(q);
      
      // Sort in JavaScript instead of Firestore
      const clients = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Client[];
      
      // Sort by createdAt descending
      return clients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      throw new Error(`Failed to get clients: ${error}`);
    }
  }

  static async getClientByEmail(email: string): Promise<Client | null> {
    try {
      const q = query(
        collection(db, 'clients'),
        where('email', '==', email)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      return {
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      } as Client;
    } catch (error) {
      throw new Error(`Failed to get client by email: ${error}`);
    }
  }

  static async updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
    try {
      const docRef = doc(db, 'clients', clientId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      throw new Error(`Failed to update client: ${error}`);
    }
  }

  // Food Management
  static async createFood(foodData: Omit<Food, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'foods'), {
        ...foodData,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Failed to create food: ${error}`);
    }
  }

  static async getFoods(): Promise<Food[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'foods'));
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt.toDate()
      })) as Food[];
    } catch (error) {
      throw new Error(`Failed to get foods: ${error}`);
    }
  }

  static async getFood(foodId: string): Promise<Food | null> {
    try {
      const docRef = doc(db, 'foods', foodId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt.toDate()
      } as Food;
    } catch (error) {
      throw new Error(`Failed to get food: ${error}`);
    }
  }

  static async deleteFood(foodId: string): Promise<void> {
    try {
      const docRef = doc(db, 'foods', foodId);
      await deleteDoc(docRef);
    } catch (error) {
      throw new Error(`Failed to delete food: ${error}`);
    }
  }

  // Log Management
  static async createLog(logData: Omit<Log, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'logs'), {
        ...logData,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Failed to create log: ${error}`);
    }
  }

  static async getLogsByClient(clientId: string, date?: string): Promise<Log[]> {
    try {
      let q = query(
        collection(db, 'logs'),
        where('clientId', '==', clientId),
        orderBy('date', 'desc')
      );

      if (date) {
        q = query(
          collection(db, 'logs'),
          where('clientId', '==', clientId),
          where('date', '==', date)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt.toDate()
      })) as Log[];
    } catch (error) {
      throw new Error(`Failed to get logs: ${error}`);
    }
  }

  static async updateLog(logId: string, updates: Partial<Log>): Promise<void> {
    try {
      const docRef = doc(db, 'logs', logId);
      await updateDoc(docRef, updates);
    } catch (error) {
      throw new Error(`Failed to update log: ${error}`);
    }
  }

  static async getLogByClientAndDate(clientId: string, date: string): Promise<Log | null> {
    try {
      const q = query(
        collection(db, 'logs'),
        where('clientId', '==', clientId),
        where('date', '==', date)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      return {
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt.toDate()
      } as Log;
    } catch (error) {
      throw new Error(`Failed to get log: ${error}`);
    }
  }

  // Real-time subscriptions
  static subscribeToClientLogs(clientId: string, callback: (logs: Log[]) => void): () => void {
    const q = query(
      collection(db, 'logs'),
      where('clientId', '==', clientId),
      orderBy('date', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const logs = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt.toDate()
      })) as Log[];
      callback(logs);
    });
  }

  static subscribeToClients(coachId: string, callback: (clients: Client[]) => void): () => void {
    const q = query(
      collection(db, 'clients'),
      where('linkedCoachId', '==', coachId)
    );

    return onSnapshot(q, (querySnapshot) => {
      const clients = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Client[];
      
      // Sort by createdAt descending
      const sortedClients = clients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(sortedClients);
    });
  }

  // Weight Tracking
  static async addWeightEntry(clientId: string, weight: number, notes?: string, photoId?: string, date?: Date): Promise<string> {
    try {
      const timestamp = date ? Timestamp.fromDate(date) : Timestamp.now();
      
      const docRef = await addDoc(collection(db, 'weightEntries'), {
        clientId,
        weight,
        notes: notes || '',
        photoId: photoId || '',
        date: timestamp,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Failed to add weight entry: ${error}`);
    }
  }

  static async updateWeightEntry(entryId: string, weight: number, notes?: string, date?: Date, photoId?: string): Promise<void> {
    try {
      const docRef = doc(db, 'weightEntries', entryId);
      const updateData: any = {
        weight,
        notes: notes || '',
        date: date ? Timestamp.fromDate(date) : Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      if (photoId !== undefined) {
        updateData.photoId = photoId || '';
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      throw new Error(`Failed to update weight entry: ${error}`);
    }
  }

  static async getWeightEntries(clientId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'weightEntries'),
        where('clientId', '==', clientId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          date: doc.data().date.toDate(),
          createdAt: doc.data().createdAt.toDate()
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
    } catch (error) {
      throw new Error(`Failed to get weight entries: ${error}`);
    }
  }

  // Progress Photos
  static async addProgressPhoto(clientId: string, photoUri: string, notes?: string, date?: Date): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'progressPhotos'), {
        clientId,
        photoUri,
        notes: notes || '',
        date: date ? Timestamp.fromDate(date) : Timestamp.now(),
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Failed to add progress photo: ${error}`);
    }
  }

  static async getProgressPhotos(clientId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'progressPhotos'),
        where('clientId', '==', clientId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          date: doc.data().date.toDate(),
          createdAt: doc.data().createdAt.toDate()
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
    } catch (error) {
      throw new Error(`Failed to get progress photos: ${error}`);
    }
  }

  // Coach Notes
  static async addCoachNote(clientId: string, note: string, sessionDate?: Date): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'coachNotes'), {
        clientId,
        note,
        sessionDate: sessionDate ? Timestamp.fromDate(sessionDate) : Timestamp.now(),
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Failed to add coach note: ${error}`);
    }
  }

  static async getCoachNotes(clientId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'coachNotes'),
        where('clientId', '==', clientId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          sessionDate: doc.data().sessionDate.toDate(),
          createdAt: doc.data().createdAt.toDate()
        }))
        .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime()); // Sort by session date descending
    } catch (error) {
      throw new Error(`Failed to get coach notes: ${error}`);
    }
  }

  // Database Management
  static async clearAllData(): Promise<void> {
    try {
      // Get collections to clear (excluding food-related data)
      const collections = ['clients', 'weightEntries', 'progressPhotos', 'coachNotes'];
      
      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const querySnapshot = await getDocs(collectionRef);
        
        // Delete all documents in the collection
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
      
      console.log('Client data cleared successfully (food data preserved)');
    } catch (error) {
      throw new Error(`Failed to clear database: ${error}`);
    }
  }

  static async clearWeightEntries(clientId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'weightEntries'),
        where('clientId', '==', clientId)
      );
      const querySnapshot = await getDocs(q);
      
      // Delete all weight entries for this client
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`Weight entries cleared for client ${clientId}`);
    } catch (error) {
      throw new Error(`Failed to clear weight entries: ${error}`);
    }
  }

  // Photo Management (Metadata only - no base64 storage)

  static async deleteClient(clientId: string): Promise<void> {
    try {
      // Delete the client document
      const docRef = doc(db, 'clients', clientId);
      await deleteDoc(docRef);
    } catch (error) {
      throw new Error(`Failed to delete client: ${error}`);
    }
  }


  // Photo metadata methods for hybrid storage
  static async addPhotoMetadata(metadata: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'photoMetadata'), {
        ...metadata,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Failed to add photo metadata: ${error}`);
    }
  }

  static async getPhotoMetadata(photoId: string): Promise<any> {
    try {
      const docRef = doc(db, 'photoMetadata', photoId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      throw new Error(`Failed to get photo metadata: ${error}`);
    }
  }

  static async getClientPhotoMetadata(
    clientId: string, 
    type?: 'weight' | 'progress' | 'client'
  ): Promise<any[]> {
    try {
      let q = query(
        collection(db, 'photoMetadata'),
        where('clientId', '==', clientId)
      );
      
      if (type) {
        q = query(q, where('type', '==', type));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        timestamp: doc.data().timestamp.toDate(),
      }));
    } catch (error) {
      throw new Error(`Failed to get client photo metadata: ${error}`);
    }
  }

  static async deletePhotoMetadata(photoId: string): Promise<void> {
    try {
      const docRef = doc(db, 'photoMetadata', photoId);
      await deleteDoc(docRef);
    } catch (error) {
      throw new Error(`Failed to delete photo metadata: ${error}`);
    }
  }
}
