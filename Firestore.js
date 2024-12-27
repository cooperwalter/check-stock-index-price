const { Firestore } = require("@google-cloud/firestore");

class FirestoreService {
  constructor(projectId, database, collectionName) {
    if (!projectId) {
      throw new Error("Project ID is required");
    }
    if (!database) {
      throw new Error("Database is required");
    }
    if (!collectionName) {
      throw new Error("Collection name is required");
    }

    this.db = new Firestore({
      projectId,
      databaseId: database,
      keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || undefined,
    });
    this.collection = this.db.collection(collectionName);
  }

  /**
   * Lists all collections in the Firestore database.
   * @returns {Promise<Array>} - A promise that resolves to an array of collection references.
   */
  async listCollections() {
    return await this.db.listCollections();
  }

  /**
   * Finds a document by a specified key-value pair.
   * @param {string} key - The field name to query.
   * @param {string} value - The value to match in the specified field.
   * @returns {Promise<FirebaseFirestore.QueryDocumentSnapshot|null>} - A promise that resolves to the first matching document snapshot or null if no document is found.
   */
  async findDocument(key, value) {
    try {
      console.log("Query is", key, value);
      const querySnapshot = await this.collection.where(key, "==", value).get();
      if (querySnapshot.empty) {
        return null;
      }
      const doc = querySnapshot.docs[0];
      return doc;
    } catch (error) {
      if (error.message.startsWith("5")) {
        // 5 means not found
        return null;
      }
      throw error;
    }
  }

  /**
   * Creates a new document with the given data.
   * @param {Object} data - The data to store in the document.
   * @returns {Promise<DocumentReference>} - A promise that resolves to a reference to the newly created document.
   */
  async createDocument(data) {
    return await this.collection.add(data);
  }

  /**
   * Updates an existing document with new data.
   * @param {string} docId - The ID of the document to update.
   * @param {Object} data - The new data to update the document with.
   * @returns {Promise<void>}
   */
  async updateDocument(docId, data) {
    const docRef = this.collection.doc(docId);
    await docRef.update(data);
  }
}

module.exports = FirestoreService;

