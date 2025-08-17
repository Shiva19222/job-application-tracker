import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './App.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// A helper function to reorder items in a list.
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// A helper function to move an item from one list to another.
const move = (source, destination, droppableSource, droppableDestination) => {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);
  destClone.splice(droppableDestination.index, 0, removed);

  const result = {};
  result[droppableSource.droppableId] = sourceClone;
  result[droppableDestination.droppableId] = destClone;

  return result;
};

// The main component for our Kanban board application.
function App() {
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    company: '',
    role: '',
    yearsOfExperience: '',
    resumeLink: '',
    currentStage: 'Applied',
    appliedDate: '',
  });

  // A state object to store candidates for each stage (Kanban columns).
  const [kanbanBoard, setKanbanBoard] = useState({
    'Applied': [],
    'Screening': [],
    'Interview': [],
    'Offer': [],
    'Rejected': []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterByStage, setFilterByStage] = useState('All');

  // Fetch candidates and populate the Kanban board on load.
  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/candidates');
      const data = await response.json();
      setCandidates(data);
      // Group candidates by stage for the Kanban board
      const initialBoard = {
        'Applied': [],
        'Screening': [],
        'Interview': [],
        'Offer': [],
        'Rejected': []
      };
      data.forEach(candidate => {
        initialBoard[candidate.currentStage].push(candidate);
      });
      setKanbanBoard(initialBoard);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCandidate({ ...newCandidate, [name]: value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:5000/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCandidate),
      });
      setNewCandidate({
        name: '',
        company: '',
        role: '',
        yearsOfExperience: '',
        resumeLink: '',
        currentStage: 'Applied',
        appliedDate: '',
      });
      fetchCandidates();
    } catch (error) {
      console.error('Error adding new candidate:', error);
    }
  };

  // Drag and Drop logic
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    
    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Dropped in the same list
    if (source.droppableId === destination.droppableId) {
      const items = reorder(
        kanbanBoard[source.droppableId],
        source.index,
        destination.index
      );
      setKanbanBoard(prevState => ({
        ...prevState,
        [source.droppableId]: items
      }));
    } 
    // Dropped in a different list
    else {
      const result = move(
        kanbanBoard[source.droppableId],
        kanbanBoard[destination.droppableId],
        source,
        destination
      );

      // Update the state with the new board structure
      setKanbanBoard(result);

      // Update the candidate's stage in the database
      const candidateId = kanbanBoard[source.droppableId][source.index]._id;
      const newStage = destination.droppableId;
      try {
        await fetch(`http://localhost:5000/api/candidates/${candidateId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ currentStage: newStage }),
        });
        fetchCandidates(); // Re-fetch to sync with database
      } catch (error) {
        console.error('Error updating candidate stage:', error);
      }
    }
  };

  const getAnalyticsData = () => {
    const stageCounts = {};
    const roleCounts = {};
    let totalExperience = 0;
    let validExperienceCount = 0;

    candidates.forEach((c) => {
      stageCounts[c.currentStage] = (stageCounts[c.currentStage] || 0) + 1;
      roleCounts[c.role] = (roleCounts[c.role] || 0) + 1;
      const exp = parseFloat(c.yearsOfExperience);
      if (!isNaN(exp) && exp >= 0) {
        totalExperience += exp;
        validExperienceCount++;
      }
    });

    const stageData = Object.keys(stageCounts).map((key) => ({
      stage: key,
      count: stageCounts[key],
    }));

    const roleData = Object.keys(roleCounts).map((key) => ({
      role: key,
      count: roleCounts[key],
    }));

    const averageExperience =
      validExperienceCount > 0 ? (totalExperience / validExperienceCount).toFixed(1) : 'N/A';

    return { stageData, roleData, averageExperience };
  };

  const { stageData, roleData, averageExperience } = getAnalyticsData();

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage =
      filterByStage === 'All' || candidate.currentStage === filterByStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="App">
      <header className="App-header">
        <h1>Job Application Tracker</h1>
      </header>
      <main>
        <div className="section">
          <h2>Add New Application</h2>
          <form onSubmit={handleFormSubmit}>
            <input type="text" name="name" placeholder="Your Name" value={newCandidate.name} onChange={handleInputChange} required />
            <input type="text" name="company" placeholder="Company" value={newCandidate.company} onChange={handleInputChange} required />
            <input type="text" name="role" placeholder="Role" value={newCandidate.role} onChange={handleInputChange} required />
            <input type="number" name="yearsOfExperience" placeholder="Years of Experience" value={newCandidate.yearsOfExperience} onChange={handleInputChange} min="0" />
            <input type="text" name="resumeLink" placeholder="Resume Link (URL)" value={newCandidate.resumeLink} onChange={handleInputChange} />
            <select name="currentStage" value={newCandidate.currentStage} onChange={handleInputChange}>
              <option value="Applied">Applied</option>
              <option value="Screening">Screening</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
            </select>
            <input type="date" name="appliedDate" value={newCandidate.appliedDate} onChange={handleInputChange} required />
            <button type="submit">Add Application</button>
          </form>
        </div>

        <div className="section">
          <h2>My Applications (Kanban Board)</h2>
          <div className="filter-controls">
            <input
              type="text"
              placeholder="Search by name, role, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="kanban-container">
              {Object.entries(kanbanBoard).map(([stage, candidates]) => (
                <Droppable droppableId={stage} key={stage}>
                  {(provided) => (
                    <div
                      className="kanban-column"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <h3 className="kanban-column-title">{stage} ({candidates.length})</h3>
                      {candidates.map((candidate, index) => (
                        <Draggable key={candidate._id} draggableId={candidate._id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="kanban-card"
                            >
                              <div className="card-header">
                                <h4>{candidate.name}</h4>
                              </div>
                              <div className="card-body">
                                <p><strong>Role:</strong> {candidate.role}</p>
                                <p><strong>Company:</strong> {candidate.company}</p>
                                <p><strong>Experience:</strong> {candidate.yearsOfExperience || 'N/A'} years</p>
                                {candidate.resumeLink && (
                                  <p><a href={candidate.resumeLink} target="_blank" rel="noopener noreferrer">Resume</a></p>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </div>

        <div className="section">
          <h2>Analytics Dashboard</h2>
          <div className="analytics-charts">
            <div className="analytics-card">
              <h3>Average Experience</h3>
              <p className="card-value">{averageExperience}</p>
              <p className="card-unit">years</p>
            </div>
            {stageData.length > 0 ? (
              <div className="chart-container">
                <h3>Candidates by Stage</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3498db" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
            {roleData.length > 0 ? (
              <div className="chart-container">
                <h3>Breakdown by Role</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={roleData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="role" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#2ecc71" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
