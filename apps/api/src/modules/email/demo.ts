export const sendVerificationEmail = async (
  verificationToken: string,
  userEmail: string,
) => {
  return "email sent";
};

export const sendForgotPasswordEmail = async (
  passwordResetToken: string,
  userEmail: string,
) => {
  return "email sent";
};
