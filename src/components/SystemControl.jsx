import { useState, useEffect } from 'react';
import './SystemControl.css';

function SystemControl() {
  const [schedules, setSchedules] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    time: '',
    days: [],
    enabled: true
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const daysOfWeek = [
    { value: '0', label: 'Sun' },
    { value: '1', label: 'Mon' },
    { value: '2', label: 'Tue' },
    { value: '3', label: 'Wed' },
    { value: '4', label: 'Thu' },
    { value: '5', label: 'Fri' },
    { value: '6', label: 'Sat' }
  ];

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/system/schedules');
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to load schedules');
    }
  };

  const handleDayToggle = (day) => {
    setNewSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();

    if (!newSchedule.time) {
      setError('Please select a time');
      return;
    }

    if (newSchedule.days.length === 0) {
      setError('Please select at least one day');
      return;
    }

    try {
      const response = await fetch('/api/system/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Schedule added successfully');
        setNewSchedule({ time: '', days: [], enabled: true });
        setShowAddForm(false);
        fetchSchedules();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to add schedule');
      }
    } catch (error) {
      console.error('Error adding schedule:', error);
      setError('Failed to add schedule');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/system/schedules/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Schedule deleted successfully');
        fetchSchedules();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setError('Failed to delete schedule');
    }
  };

  const handleToggleSchedule = async (id, enabled) => {
    try {
      const response = await fetch(`/api/system/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      });

      const data = await response.json();

      if (data.success) {
        fetchSchedules();
      } else {
        setError(data.error || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      setError('Failed to update schedule');
    }
  };

  const handleShutdownNow = async () => {
    if (!confirm('Are you sure you want to shutdown now? This will turn off your Raspberry Pi immediately.')) {
      return;
    }

    try {
      const response = await fetch('/api/system/shutdown', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('System is shutting down...');
      } else {
        setError(data.error || 'Failed to shutdown');
      }
    } catch (error) {
      console.error('Error during shutdown:', error);
      setError('Failed to initiate shutdown');
    }
  };

  const handleRebootNow = async () => {
    if (!confirm('Are you sure you want to reboot now? This will restart your Raspberry Pi immediately.')) {
      return;
    }

    try {
      const response = await fetch('/api/system/reboot', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('System is rebooting...');
      } else {
        setError(data.error || 'Failed to reboot');
      }
    } catch (error) {
      console.error('Error during reboot:', error);
      setError('Failed to initiate reboot');
    }
  };

  const getDayLabels = (days) => {
    const sortedDays = [...days].sort();
    return sortedDays.map(day => daysOfWeek.find(d => d.value === day)?.label).join(', ');
  };

  return (
    <div className="system-control-container">
      <h2>System Control</h2>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess(null)} className="alert-close">×</button>
        </div>
      )}

      <div className="control-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button onClick={handleRebootNow} className="btn btn-warning">
            🔄 Reboot Now
          </button>
          <button onClick={handleShutdownNow} className="btn btn-danger">
            ⏻ Shutdown Now
          </button>
        </div>
      </div>

      <div className="control-section">
        <div className="section-header">
          <h3>Shutdown Schedules</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary"
          >
            {showAddForm ? '✕ Cancel' : '+ Add Schedule'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddSchedule} className="schedule-form">
            <div className="form-group">
              <label>Time:</label>
              <input
                type="time"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Days:</label>
              <div className="days-selector">
                {daysOfWeek.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`day-btn ${newSchedule.days.includes(day.value) ? 'active' : ''}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-success">
              Save Schedule
            </button>
          </form>
        )}

        <div className="schedules-list">
          {schedules.length === 0 ? (
            <div className="no-schedules">
              <p>No shutdown schedules configured</p>
              <p className="hint">Click "Add Schedule" to create your first shutdown schedule</p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className={`schedule-item ${!schedule.enabled ? 'disabled' : ''}`}>
                <div className="schedule-info">
                  <div className="schedule-time">🕐 {schedule.time}</div>
                  <div className="schedule-days">{getDayLabels(schedule.days)}</div>
                </div>
                <div className="schedule-actions">
                  <button
                    onClick={() => handleToggleSchedule(schedule.id, schedule.enabled)}
                    className={`btn-toggle ${schedule.enabled ? 'enabled' : 'disabled'}`}
                    title={schedule.enabled ? 'Disable' : 'Enable'}
                  >
                    {schedule.enabled ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="btn-delete"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemControl;
