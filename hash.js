import bcrypt from 'bcryptjs';

async function run() {
  // The plaintext password you expect to test
  const plaintextPassword = 'superadmin123';
  
  // Replace the following string with the actual hash copied from Supabase
  const storedHash = '$2b$10$vSd.jA9QsFGb9WIjLx24HuDIcJymBpmLOek0F3hW7YrFA/mJfgnuK';
  
  try {
    // Compare the plaintext password with the stored hash
    const isMatch = await bcrypt.compare(plaintextPassword, storedHash);
    console.log('Does "superadmin123" match the stored hash?', isMatch); // Expected: true

    // Optionally, test with an incorrect password
    const wrongPassword = 'wrongPassword';
    const isWrongMatch = await bcrypt.compare(wrongPassword, storedHash);
    console.log('Does "wrongPassword" match the stored hash?', isWrongMatch); // Expected: false
  } catch (error) {
    console.error('Error during password comparison:', error);
  }
}

run();
