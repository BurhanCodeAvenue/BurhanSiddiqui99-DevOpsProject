/**
 * Represents a user with basic profile information.
 */
export interface User {
  /**
   * The unique identifier of the user.
   */
  id: string;
  /**
   * The name of the user.
   */
  name: string;
  /**
   * The URL of the user's profile picture.
   */
  profilePic?: string;
}

/**
 * Asynchronously searches for users by name.
 *
 * @param query The search query to match user names.
 * @returns A promise that resolves to an array of User objects matching the search query.
 */
export async function searchUsers(query: string): Promise<User[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      id: '1',
      name: 'John Doe',
      profilePic: 'https://example.com/profile1.jpg',
    },
    {
      id: '2',
      name: 'Jane Smith',
      profilePic: 'https://example.com/profile2.jpg',
    },
  ];
}
