export type StoredFile = {
  url: string;
  size: number;
};

export type UploadTicket = {
  uploadUrl: string;
  publicUrl: string;
};

export type StorageProvider = {
  id: string;
  putFile(options: {
    buffer: Buffer;
    filename: string;
    mime: string;
    folder?: string;
  }): Promise<StoredFile>;
  createUploadTicket(options: {
    filename: string;
    mime: string;
    folder?: string;
  }): Promise<UploadTicket>;
  deleteFiles(urls: string[]): Promise<void>;
};
