import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase.config';
import { User, UserRole } from '../types';

export class AuthService {
  /**
   * Register a new user with role
   */
  static async register(email: string, password: string, name: string, role: UserRole): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const user: User = {
        id: firebaseUser.uid,
        role,
        email,
        name,
        createdAt: new Date()
      };

      // Save user data to Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...user,
        createdAt: user.createdAt.toISOString()
      });

      return user;
    } catch (error) {
      throw new Error(`Registration failed: ${error}`);
    }
  }

  /**
   * Sign in existing user
   */
  static async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();
      return {
        id: userData.id,
        role: userData.role,
        email: userData.email,
        name: userData.name,
        createdAt: new Date(userData.createdAt)
      };
    } catch (error) {
      throw new Error(`Sign in failed: ${error}`);
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(`Sign out failed: ${error}`);
    }
  }

  /**
   * Get current user data
   */
  static async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data();
      return {
        id: userData.id,
        role: userData.role,
        email: userData.email,
        name: userData.name,
        createdAt: new Date(userData.createdAt)
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}
