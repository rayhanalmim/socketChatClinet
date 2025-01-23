/* eslint-disable no-undef */
import mongoose from "mongoose";
import Message from "#models/messages/messagesModel.js";
import { createConversationId, fetchMessages, handleError } from "./utils.js";
import { uploadBuffer } from "#config/space.js";
import Employee from "#models/authModels/employeeModel.js";
export const handleDMEvents = (socket, anthillChat) => {
  socket.on("join_dm", async ({ conversationId }) => {
    try {
      socket.join(conversationId);

      console.log("user joined dm", conversationId);
      const messages = await fetchMessages({ conversationId });
      console.log("messages", messages);
      socket.emit("private_message_history", messages);
    } catch (error) {
      handleError(socket, error, "Failed to join the private conversation");
    }
  });

  // Handle direct message with file upload
  socket.on(
    "send_dm",
    async ({ senderId, recipientId, content, attachmentData, messageType }) => {
      try {
        // Validate user IDs
        if (
          !mongoose.Types.ObjectId.isValid(senderId) ||
          !mongoose.Types.ObjectId.isValid(recipientId)
        ) {
          throw new Error("Invalid user IDs");
        }

        console.log('attachment should be hit', attachmentData.attachment);

        // Generate conversation ID
        const conversationId = createConversationId(senderId, recipientId);

        let attachmentUrl = null;

        // Handle attachment (if provided)
        if (attachmentData.attachment) {
          console.log("Full attachment object:", attachmentData.attachment);

          // Decode base64 string to buffer
          const buffer = Buffer.from(attachmentData.attachment.data, "base64");
        


          // Upload file to DigitalOcean Spaces
          const result = await uploadBuffer(
            attachmentData.filePath,
            buffer,
            attachmentData.attachment.mimetype
          );

          attachmentUrl = result;
        }

        // Retrieve sender's information
        const user = await Employee.findById(senderId);
        if (!user) {
          throw new Error("Sender not found");
        }

        // Create and save the message
        const message = new Message({
          senderId,
          senderName: user.name,
          senderImage: user.dp,
          recipientId,
          content,
          messageType,
          conversationId,
          attachment: attachmentUrl, // Save file URL (or null if no attachment)
        });
        await message.save();

        // Emit the message to the conversation room
        anthillChat.to(conversationId).emit("recived_dm", message);
      } catch (error) {
        console.error(error);
        handleError(socket, error, "Failed to send the direct message");
      }
    }
  );
};
