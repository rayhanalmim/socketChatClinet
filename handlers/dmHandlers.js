import mongoose from "mongoose";
import Message from "#models/messages/messagesModel.js";
import { createConversationId, fetchMessages, handleError } from "./utils.js";
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

  socket.on("send_dm", async ({ senderId, recipientId, content, senderName }) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(senderId) ||
        !mongoose.Types.ObjectId.isValid(recipientId)
      ) {
        throw new Error("Invalid user IDs");
      }
      const conversationId = createConversationId(senderId, recipientId);
      const employee = await Employee.findById(senderId);
      
      const message = new Message({
        senderId,
        senderName,
        senderImage : employee.dp,
        recipientId,
        content,
        messageType: "text",
        conversationId,
      });

      console.log("message", message);

      await message.save();
      anthillChat.to(conversationId).emit("recived_dm", message);
    } catch (error) {
      console.log(error);
      handleError(socket, error, "Failed to send the direct message");
    }
  });
};
