package com.mosque.crm.models;

import com.mosque.crm.entity.Person;

public class PersonAndAge {

	private final Person person;
	private final Integer age;

	public PersonAndAge(Person person, Integer age) {
		this.person = person;
		this.age = age;
	}

	public Person getPerson() {
		return person;
	}

	public Integer getAge() {
		return age;
	}
	
	
}
