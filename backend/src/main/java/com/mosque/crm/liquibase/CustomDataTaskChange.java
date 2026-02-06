package com.mosque.crm.liquibase;

import java.io.ByteArrayInputStream;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;

import liquibase.change.custom.CustomTaskChange;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.DatabaseException;
import liquibase.exception.SetupException;
import liquibase.exception.ValidationErrors;
import liquibase.resource.ResourceAccessor;

public abstract class CustomDataTaskChange implements CustomTaskChange {

	protected JdbcConnection connection;

	@Override
	public void execute(Database database) throws CustomChangeException {
		connection = (JdbcConnection) database.getConnection();

		try {
			handleUpdate();
			connection.commit();
		} catch (DatabaseException | SQLException e) {
			e.printStackTrace();
		}
	}

	public void handleUpdate() throws DatabaseException, SQLException {
	}

	@Override
	public String getConfirmationMessage() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public void setUp() throws SetupException {
		// TODO Auto-generated method stub

	}

	@Override
	public void setFileOpener(ResourceAccessor resourceAccessor) {
		// TODO Auto-generated method stub

	}

	@Override
	public ValidationErrors validate(Database database) {
		// TODO Auto-generated method stub
		return null;
	}

	protected void setData(PreparedStatement prepareStatement, int parameterIndex, Object x) throws SQLException {
		if (x == null) {
			prepareStatement.setNull(parameterIndex, Types.NULL);
		} else {
			if (x instanceof String) {
				if (x.toString().trim().isEmpty()) {
					prepareStatement.setNull(parameterIndex, Types.NULL);
				} else {
					prepareStatement.setString(parameterIndex, (String) x);
				}
			} else if (x instanceof Long) {
				prepareStatement.setLong(parameterIndex, (long) x);
			} else if (x instanceof Boolean) {
				prepareStatement.setBoolean(parameterIndex, (boolean) x);
			} else if (x instanceof Date) {
				prepareStatement.setDate(parameterIndex, new java.sql.Date(((Date) x).getTime()));
			} else if (x instanceof byte[]) {
				prepareStatement.setBinaryStream(parameterIndex, new ByteArrayInputStream((byte[]) x),
						((byte[]) x).length);
			} else {
				prepareStatement.setObject(parameterIndex, x);
			}
		}
	}
}
