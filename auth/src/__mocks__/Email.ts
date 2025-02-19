export const Email = jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue(true), // Mock the send method
  }));
  