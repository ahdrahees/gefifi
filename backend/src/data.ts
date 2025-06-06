import fs from 'fs';
import path from 'path';

// Define the path to the data directory relative to the src directory
const dataDir = path.join(__dirname, '..', 'data');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory at: ${dataDir}`);
}

export interface Identifiable {
  id: string;
}

export class SimpleDB<T extends Identifiable> {
  private filePath: string;

  constructor(fileName: string) {
    this.filePath = path.join(dataDir, fileName);
    this._ensureFileExists();
  }

  private _ensureFileExists(): void {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
      console.log(`Created data file at: ${this.filePath}`);
    }
  }

  private async _readData(): Promise<T[]> {
    try {
      const fileContent = await fs.promises.readFile(this.filePath, 'utf-8');
      if (fileContent.trim() === '') {
        return []; // Handle empty file
      }
      return JSON.parse(fileContent) as T[];
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File might have been deleted after check, re-create it empty
        await this._writeData([]);
        return [];
      } else if (error instanceof SyntaxError) {
        console.error(`SyntaxError parsing JSON from ${this.filePath}. Returning empty array. Error: ${error.message}`);
        // Consider backing up the corrupted file before overwriting
        // For simplicity in a demo, we might just re-initialize or throw
        await this._writeData([]); // Re-initialize to empty array
        return [];
      }
      console.error(`Error reading data from ${this.filePath}:`, error);
      throw error; // Rethrow other errors
    }
  }

  private async _writeData(data: T[]): Promise<void> {
    await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  public async getAll(): Promise<T[]> {
    return this._readData();
  }

  public async findById(id: string): Promise<T | undefined> {
    const data = await this._readData();
    return data.find(item => item.id === id);
  }

  public async create(item: T): Promise<T> {
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
      throw new Error('Item must have a non-empty string id');
    }
    const data = await this._readData();
    if (data.some(existingItem => existingItem.id === item.id)) {
      throw new Error(`Item with id '${item.id}' already exists in ${path.basename(this.filePath)}.`);
    }
    data.push(item);
    await this._writeData(data);
    return item;
  }

  public async update(id: string, dataToUpdate: Partial<Omit<T, 'id'>>): Promise<T | null> {
    const data = await this._readData();
    const itemIndex = data.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      return null; // Item not found
    }

    // Update item, ensuring id is not changed by dataToUpdate
    const updatedItem = { ...data[itemIndex], ...dataToUpdate, id };
    data[itemIndex] = updatedItem;
    await this._writeData(data);
    return updatedItem;
  }
  
  public async writeAll(data: T[]): Promise<void> {
    // Validate all items have an ID
    if (data.some(item => !item.id || typeof item.id !== 'string' || item.id.trim() === '')) {
        throw new Error('All items in the array must have a non-empty string id');
    }
    await this._writeData(data);
  }

  public async delete(id: string): Promise<boolean> {
    let data = await this._readData();
    const initialLength = data.length;
    data = data.filter(item => item.id !== id);
    if (data.length < initialLength) {
      await this._writeData(data);
      return true; // Item was deleted
    }
    return false; // Item not found
  }
}

// Ensure required data files are initialized
const requiredDataFiles = ['users.json', 'workRequests.json', 'chats.json', 'messages.json', 'contracts.json'];
requiredDataFiles.forEach(fileName => {
  // The constructor of SimpleDB will ensure the file exists.
  // We don't need to store the instance here, just ensure creation.
  new SimpleDB<Identifiable>(fileName); 
});

console.log('SimpleDB class loaded and required data files ensured.');