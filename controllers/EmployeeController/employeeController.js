import Employee from "#models/authModels/employeeModel.js";
import asyncHandler from "express-async-handler";

const searchEmployee = asyncHandler(async (req, res) => {
  const { search } = req.query;

  try {
    // If no search term is provided, return an empty array
    if (!search) {
      return res.status(200).json([]);
    }

    // Query to find employees with names matching the search term
    const employees = await Employee.find({
      name: { $regex: search, $options: "i" }, // Case-insensitive search
    }).select("_id name"); // Return only _id and name fields for simplicity

    // Format data for react-select
    const formattedEmployees = employees.map((employee) => ({
      value: employee._id,
      label: employee.name,
    }));

    return res.status(200).json(formattedEmployees);
  } catch (error) {
    console.error("Error searching employees:", error);
    return res.status(500).json({ message: "Error fetching employees" });
  }
});

export { searchEmployee };
