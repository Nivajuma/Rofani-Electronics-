import React, { useState } from 'react';
import { UserCheck, Clock, CheckCircle2, AlertCircle, Calendar, Plus, User, FileSpreadsheet, Award, Percent, CreditCard, Users } from 'lucide-react';
import { AttendanceRecord, User as Employee, Transaction, StaffCommissionPayout, WorkerLoan, WorkerLoanRepayment } from '../../types';
import { StaffCommissionView } from './StaffCommissionView';
import { WorkerLoansView } from './WorkerLoansView';
import { WorkerDirectoryView } from './WorkerDirectoryView';

interface AttendanceViewProps {
  attendanceRecords: AttendanceRecord[];
  allUsers: Employee[];
  currentUser: Employee;
  transactions: Transaction[];
  commissionPayouts: StaffCommissionPayout[];
  workerLoans: WorkerLoan[];
  onClockIn: (record: AttendanceRecord) => void;
  onClockOut: (recordId: string, clockOutTime: string) => void;
  onPayCommission: (payout: StaffCommissionPayout) => void;
  onUpdateUserCommissionRate?: (userId: string, rate: number) => void;
  onUpdateUserCommissionSettings?: (userId: string, settings: Partial<Employee>) => void;
  onReattributeSale?: (txId: string, salesRepId: string, salesRepName: string) => void;
  onIssueLoan: (loan: WorkerLoan) => void;
  onRepayLoan: (loanId: string, repayment: WorkerLoanRepayment) => void;
  onUpdateLoanStatus?: (loanId: string, status: WorkerLoan['status']) => void;
  onAddUser?: (newUser: Employee) => void;
  onUpdateUser?: (updatedUser: Employee) => void;
  onDeleteUser?: (userId: string) => void;
  onOpenStaffModal?: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendanceRecords,
  allUsers,
  currentUser,
  transactions,
  commissionPayouts,
  workerLoans,
  onClockIn,
  onClockOut,
  onPayCommission,
  onUpdateUserCommissionRate,
  onUpdateUserCommissionSettings,
  onReattributeSale,
  onIssueLoan,
  onRepayLoan,
  onUpdateLoanStatus,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onOpenStaffModal,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'workers' | 'commission' | 'loans'>('attendance');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [showClockModal, setShowClockModal] = useState(false);

  // New manual attendance entry state
  const [selectedStaffId, setSelectedStaffId] = useState(allUsers[0]?.id || '');
  const [clockInTime, setClockInTime] = useState('08:00');
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceRecord['status']>('Present');
  const [attendanceNotes, setAttendanceNotes] = useState('');

  // Today's attendance record for current user
  const todayStr = new Date().toISOString().slice(0, 10);
  const myTodayRecord = attendanceRecords.find(
    (a) => a.employeeId === currentUser.id && a.date === todayStr
  );

  const filteredRecords = attendanceRecords.filter((a) => a.date === selectedDate);

  // Quick Clock In current user
  const handleMyClockIn = () => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const status = now.getHours() >= 9 ? 'Late' : 'Present';

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      role: currentUser.role,
      date: todayStr,
      clockInTime: timeStr,
      status,
      notes: 'Self clock-in via POS'
    };

    onClockIn(record);
  };

  // Quick Clock Out current user
  const handleMyClockOut = () => {
    if (!myTodayRecord) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    onClockOut(myTodayRecord.id, timeStr);
  };

  // Manual Staff Clock In submit
  const handleManualStaffClockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = allUsers.find((u) => u.id === selectedStaffId);
    if (!staff) return;

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: staff.id,
      employeeName: staff.name,
      role: staff.role,
      date: selectedDate,
      clockInTime,
      status: attendanceStatus,
      notes: attendanceNotes
    };

    onClockIn(record);
    setShowClockModal(false);
    setAttendanceNotes('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* View Switcher Tabs */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit gap-2 shadow-md">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Shift Register & Clock-Ins</span>
        </button>

        <button
          onClick={() => setActiveTab('commission')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'commission'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>Worker Daily Sales Commission (% Pay)</span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'loans'
              ? 'bg-emerald-600 text-slate-950 font-extrabold shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Worker Loans & Advances 💳</span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'workers'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-purple-300" />
          <span>Worker Directory & Manage</span>
          <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
            {allUsers.length}
          </span>
        </button>
      </div>

      {activeTab === 'workers' ? (
        <WorkerDirectoryView
          allUsers={allUsers}
          currentUser={currentUser}
          onAddUser={onAddUser}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
          onOpenStaffModal={onOpenStaffModal}
          transactions={transactions}
          attendanceRecords={attendanceRecords}
          workerLoans={workerLoans}
        />
      ) : activeTab === 'loans' ? (
        <WorkerLoansView
          loans={workerLoans}
          allUsers={allUsers}
          currentUser={currentUser}
          onIssueLoan={onIssueLoan}
          onRepayLoan={onRepayLoan}
          onUpdateLoanStatus={onUpdateLoanStatus}
        />
      ) : activeTab === 'commission' ? (
        <StaffCommissionView
          transactions={transactions}
          allUsers={allUsers}
          currentUser={currentUser}
          commissionPayouts={commissionPayouts}
          workerLoans={workerLoans}
          onPayCommission={onPayCommission}
          onUpdateUserCommissionRate={onUpdateUserCommissionRate}
          onUpdateUserCommissionSettings={onUpdateUserCommissionSettings}
          onReattributeSale={onReattributeSale}
        />
      ) : (
        <>
          {/* Top Banner & Quick Clock In Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">Staff Attendance & Shift Log</h2>
            <p className="text-xs text-slate-400">
              Track employee clock-ins, shift hours, tardiness, and monthly work registers
            </p>
          </div>
        </div>

        {/* Current Active User Clock-in Action Card */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-3 text-xs">
          <div className="text-right">
            <div className="font-semibold text-slate-200">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400">
              {myTodayRecord
                ? `Clocked In: ${myTodayRecord.clockInTime} ${myTodayRecord.clockOutTime ? `| Out: ${myTodayRecord.clockOutTime}` : ''}`
                : 'Not Clocked In Today'}
            </div>
          </div>

          {!myTodayRecord ? (
            <button
              onClick={handleMyClockIn}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg text-xs transition flex items-center gap-1"
            >
              <Clock className="w-4 h-4" /> Clock In
            </button>
          ) : !myTodayRecord.clockOutTime ? (
            <button
              onClick={handleMyClockOut}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-2 rounded-lg text-xs transition flex items-center gap-1"
            >
              <Clock className="w-4 h-4" /> Clock Out
            </button>
          ) : (
            <span className="bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg font-semibold">
              Shift Complete
            </span>
          )}
        </div>
      </div>

      {/* Date Filter & Log Manual Attendance Button */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span className="text-slate-400 font-semibold">Select Log Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl font-mono focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowClockModal(true)}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Log Staff Attendance Record
        </button>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 font-bold text-sm text-slate-200">
          Attendance Log for {selectedDate}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Employee Name</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5 text-center">Clock In Time</th>
                <th className="p-3.5 text-center">Clock Out Time</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Remarks / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No attendance logs recorded for {selectedDate}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3.5 font-bold text-slate-100">{rec.employeeName}</td>

                    <td className="p-3.5">
                      <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                        {rec.role}
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-sky-400">
                      {rec.clockInTime}
                    </td>

                    <td className="p-3.5 text-center font-mono text-slate-300">
                      {rec.clockOutTime || '--:--'}
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rec.status === 'Present'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : rec.status === 'Late'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : rec.status === 'Absent'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-400 text-[11px] italic">
                      {rec.notes || 'Normal Shift'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LOG MANUAL ATTENDANCE */}
      {showClockModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-200">Log Staff Attendance</h3>
              <button onClick={() => setShowClockModal(false)} className="p-1 text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleManualStaffClockInSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Employee *</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clock In Time *</label>
                <input
                  type="time"
                  required
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Attendance Status</label>
                <select
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half-Day">Half-Day</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Traffic delay, approved leave"
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClockModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2 rounded-xl">
                  Save Attendance Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
