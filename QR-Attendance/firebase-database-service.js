// Firebase Database Service Layer
// This service replaces all localStorage operations with Firebase Firestore operations

class FirebaseDatabaseService {
    constructor() {
        this.db = window.firebaseDb;
        this.services = window.firebaseServices;
        this.parentCollection = 'AttendanceSystem';
        this.studentsCollection = `${this.parentCollection}_students`;
        this.attendanceCollection = `${this.parentCollection}_attendance`;
        this.eventsCollection = `${this.parentCollection}_events`;
        this.settingsCollection = `${this.parentCollection}_settings`;
    }

    // ===== STUDENT DATABASE OPERATIONS =====
    
    async getStudents() {
        try {
            const querySnapshot = await window.firebaseDb.collection(this.studentsCollection).get();
            const students = [];
            querySnapshot.forEach((doc) => {
                students.push({ id: doc.id, ...doc.data() });
            });
            return students;
        } catch (error) {
            console.error('Error getting students:', error);
            return [];
        }
    }

    async addStudent(studentData) {
        try {
            const docRef = await window.firebaseDb.collection(this.studentsCollection).add({
                studentId: studentData.studentId,
                studentName: studentData.studentName,
                section: studentData.section,
                uniqueId: studentData.studentId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding student:', error);
            throw error;
        }
    }

    async updateStudent(studentId, studentData) {
        try {
            const students = await this.getStudents();
            const student = students.find(s => s.studentId === studentId);
            if (student) {
                await window.firebaseDb.collection(this.studentsCollection).doc(student.id).update({
                    ...studentData,
                    updatedAt: new Date()
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    }

    async deleteStudent(studentId) {
        try {
            const students = await this.getStudents();
            const student = students.find(s => s.studentId === studentId);
            if (student) {
                await window.firebaseDb.collection(this.studentsCollection).doc(student.id).delete();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    }

    async findStudentByBarcode(barcodeValue) {
        try {
            const students = await this.getStudents();
            return students.find(s => this.encodeStudentData(s.studentId) === barcodeValue);
        } catch (error) {
            console.error('Error finding student by barcode:', error);
            return null;
        }
    }

    // ===== ATTENDANCE RECORDS OPERATIONS =====

    async getAttendanceRecords() {
        try {
            const querySnapshot = await window.firebaseDb.collection(this.attendanceCollection).get();
            const records = [];
            querySnapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() });
            });
            return records;
        } catch (error) {
            console.error('Error getting attendance records:', error);
            return [];
        }
    }

    async addAttendanceRecord(recordData) {
        try {
            const docRef = await window.firebaseDb.collection(this.attendanceCollection).add({
                ...recordData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding attendance record:', error);
            throw error;
        }
    }

    async updateAttendanceRecord(recordId, updateData) {
        try {
            await window.firebaseDb.collection(this.attendanceCollection).doc(recordId).update({
                ...updateData,
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            console.error('Error updating attendance record:', error);
            throw error;
        }
    }

    async findAttendanceRecord(studentId, section, event, date) {
        try {
            const records = await this.getAttendanceRecords();
            return records.find(r => 
                r.studentId === studentId && 
                r.section === section && 
                r.event === event && 
                r.date === date
            );
        } catch (error) {
            console.error('Error finding attendance record:', error);
            return null;
        }
    }

    async getAttendanceRecordsByEvent(eventName) {
        try {
            // Validate eventName
            if (!eventName || eventName === undefined || eventName === null) {
                console.warn('getAttendanceRecordsByEvent called with invalid eventName:', eventName);
                return [];
            }
            
            const querySnapshot = await window.firebaseDb.collection(this.attendanceCollection)
                .where('event', '==', eventName)
                .get();
            const records = [];
            querySnapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() });
            });
            return records;
        } catch (error) {
            console.error('Error getting attendance records by event:', error);
            return [];
        }
    }

    async deleteAttendanceRecordsByEvent(eventName) {
        try {
            const records = await this.getAttendanceRecordsByEvent(eventName);
            const deletePromises = records.map(record => 
                window.firebaseDb.collection(this.attendanceCollection).doc(record.id).delete()
            );
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error deleting attendance records by event:', error);
            throw error;
        }
    }

    // ===== EVENT OPERATIONS =====

    async createEvent(eventData) {
        try {
            const docRef = await window.firebaseDb.collection(this.eventsCollection).add({
                ...eventData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }

    async getEventsWithAttendanceCounts() {
        try {
            const events = await this.getEvents();
            const eventsWithCounts = [];
            
            for (const event of events) {
                const attendanceCount = await this.getAttendanceRecordsByEvent(event.name);
                eventsWithCounts.push({
                    ...event,
                    attendanceCount: attendanceCount.length,
                    firstDate: attendanceCount.length > 0 ? 
                        attendanceCount.reduce((min, record) => 
                            !min || new Date(record.date) < new Date(min.date) ? record : min
                        ).date : null,
                    lastDate: attendanceCount.length > 0 ? 
                        attendanceCount.reduce((max, record) => 
                            !max || new Date(record.date) > new Date(max.date) ? record : max
                        ).date : null
                });
            }
            
            return eventsWithCounts;
        } catch (error) {
            console.error('Error getting events with attendance counts:', error);
            return [];
        }
    }

    async getEvents() {
        try {
            const querySnapshot = await window.firebaseDb.collection(this.eventsCollection).get();
            const events = [];
            querySnapshot.forEach((doc) => {
                events.push({ id: doc.id, ...doc.data() });
            });
            return events;
        } catch (error) {
            console.error('Error getting events:', error);
            return [];
        }
    }

    async getEvent(eventId) {
        try {
            const doc = await window.firebaseDb.collection(this.eventsCollection).doc(eventId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting event:', error);
            return null;
        }
    }

    async updateEvent(eventId, eventData) {
        try {
            await window.firebaseDb.collection(this.eventsCollection).doc(eventId).update({
                ...eventData,
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    }

    async deleteEvent(eventId) {
        try {
            // First, get the event to retrieve the event name
            const event = await this.getEvent(eventId);
            if (!event) {
                throw new Error(`Event with ID ${eventId} not found`);
            }

            // Delete all attendance records for this event by event name
            const attendanceRecords = await this.getAttendanceRecordsByEvent(event.name);
            const deletePromises = attendanceRecords.map(record => 
                window.firebaseDb.collection(this.attendanceCollection).doc(record.id).delete()
            );
            await Promise.all(deletePromises);

            // Then delete the event itself
            await window.firebaseDb.collection(this.eventsCollection).doc(eventId).delete();
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    }

    async getCurrentEvent() {
        try {
            const doc = await window.firebaseDb.collection(this.settingsCollection).doc('currentEvent').get();
            if (doc.exists) {
                return doc.data().eventName;
            }
            // Fallback to localStorage if no Firebase record exists
            return localStorage.getItem('currentEvent');
        } catch (error) {
            console.error('Error getting current event:', error);
            // Fallback to localStorage
            return localStorage.getItem('currentEvent');
        }
    }

    async setCurrentEvent(eventName) {
        try {
            await window.firebaseDb.collection(this.settingsCollection).doc('currentEvent').set({
                eventName: eventName,
                updatedAt: new Date()
            });
            // Also update localStorage as backup
            localStorage.setItem('currentEvent', eventName);
            return true;
        } catch (error) {
            console.error('Error setting current event:', error);
            // Fallback to localStorage
            localStorage.setItem('currentEvent', eventName);
            return false;
        }
    }

    // ===== REAL-TIME LISTENERS =====

    async listenToAttendanceRecords(callback) {
        try {
            return window.firebaseDb.collection(this.attendanceCollection).onSnapshot(
                (querySnapshot) => {
                    const records = [];
                    querySnapshot.forEach((doc) => {
                        records.push({ id: doc.id, ...doc.data() });
                    });
                    callback(records);
                }
            );
        } catch (error) {
            console.error('Error setting up attendance records listener:', error);
            return null;
        }
    }

    async listenToStudents(callback) {
        try {
            return window.firebaseDb.collection(this.studentsCollection).onSnapshot(
                (querySnapshot) => {
                    const students = [];
                    querySnapshot.forEach((doc) => {
                        students.push({ id: doc.id, ...doc.data() });
                    });
                    callback(students);
                }
            );
        } catch (error) {
            console.error('Error setting up students listener:', error);
            return null;
        }
    }

    // ===== UTILITY FUNCTIONS =====

    encodeStudentData(studentId) {
        // Use the existing encoder function from encoder.js
        if (typeof window.encodeStudentData === 'function') {
            return window.encodeStudentData(studentId);
        }
        return studentId; // Fallback if encoder is not available
    }

    // ===== MIGRATION HELPERS =====

    async migrateFromLocalStorage() {
        try {
            console.log('Starting migration from localStorage to Firebase...');
            
            // Migrate students
            const localStudents = JSON.parse(localStorage.getItem('barcodeStudents')) || [];
            console.log(`Found ${localStudents.length} students to migrate`);
            
            for (const student of localStudents) {
                try {
                    await this.addStudent(student);
                } catch (error) {
                    console.warn(`Failed to migrate student ${student.studentId}:`, error);
                }
            }

            // Migrate attendance records
            const localRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
            console.log(`Found ${localRecords.length} attendance records to migrate`);
            
            for (const record of localRecords) {
                try {
                    await this.addAttendanceRecord(record);
                } catch (error) {
                    console.warn(`Failed to migrate attendance record for ${record.studentId}:`, error);
                }
            }

            console.log('Migration completed successfully!');
            return true;
        } catch (error) {
            console.error('Error during migration:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            // Clear students
            const students = await this.getStudents();
            const studentDeletePromises = students.map(student => 
                window.firebaseDb.collection(this.studentsCollection).doc(student.id).delete()
            );
            await Promise.all(studentDeletePromises);

            // Clear attendance records
            const records = await this.getAttendanceRecords();
            const recordDeletePromises = records.map(record => 
                window.firebaseDb.collection(this.attendanceCollection).doc(record.id).delete()
            );
            await Promise.all(recordDeletePromises);

            console.log('All data cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            throw error;
        }
    }
}

// Create global instance
window.firebaseDB = new FirebaseDatabaseService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseDatabaseService;
}
